use serde::Serialize;
use std::time::Duration;

#[derive(Serialize)]
pub struct ModelListResponse {
    status: u16,
    body: String,
    content_type: String,
}

// Only read model metadata. Never follow redirects with a provider credential.
fn validate_url(input: &str) -> Result<reqwest::Url, String> {
    let url = reqwest::Url::parse(input).map_err(|_| "模型接口地址无效")?;
    let pricing = url.as_str() == "https://api.tu-zi.com/api/pricing";
    if !["http", "https"].contains(&url.scheme())
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.fragment().is_some()
        || (!pricing && !url.path().ends_with("/models"))
    {
        return Err("仅允许 HTTP/HTTPS 模型列表接口".into());
    }
    Ok(url)
}

#[tauri::command]
pub async fn query_model_list(
    url: String,
    authorization: Option<String>,
    google_api_key: Option<String>,
    timeout_ms: Option<u64>,
) -> Result<ModelListResponse, String> {
    let url = validate_url(&url)?;
    let pricing = url.as_str() == "https://api.tu-zi.com/api/pricing";
    let mut builder = reqwest::Client::builder().redirect(reqwest::redirect::Policy::none());
    // Preserve the caller's existing discovery timeout; do not add retries.
    if let Some(timeout) = timeout_ms { builder = builder.timeout(Duration::from_millis(timeout)); }
    let client = builder.build().map_err(|_| "无法初始化模型请求")?;
    let mut request = client.get(url);
    if !pricing {
        if let Some(value) = authorization { request = request.header(reqwest::header::AUTHORIZATION, value); }
        if let Some(value) = google_api_key { request = request.header("x-goog-api-key", value); }
    }
    let mut response = request.send().await.map_err(|error| {
        if error.is_timeout() { "模型列表请求超时，请稍后重试" } else { "无法连接模型接口，请检查接口地址、网络及系统代理" }.to_string()
    })?;
    let status = response.status().as_u16();
    let content_type = response.headers().get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok()).unwrap_or_default().to_string();
    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|_| "读取模型列表失败")? {
        // Match the existing public pricing reader's 20 MiB bound.
        if pricing && bytes.len().saturating_add(chunk.len()) > 20 * 1024 * 1024 {
            return Err("模型响应过大".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    let body = String::from_utf8(bytes).map_err(|_| "模型接口未返回有效文本")?;
    Ok(ModelListResponse { status, body, content_type })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpListener;
    #[test]
    fn restricts_requests_to_model_metadata() {
        for url in ["https://api.tu-zi.com/v1/models", "http://127.0.0.1:8080/v1/models", "https://example.com/prefix/v1beta/models", "https://api.tu-zi.com/api/pricing"] {
            assert!(validate_url(url).is_ok(), "{url}");
        }
        for url in ["file:///tmp/models", "https://key@example.com/v1/models", "https://example.com/v1/models#x", "https://example.com/api/pricing", "https://api.tu-zi.com/v1/chat/completions"] {
            assert!(validate_url(url).is_err(), "{url}");
        }
    }

    #[test]
    fn preserves_http_results_and_does_not_follow_redirects() {
        for (status, body) in [
            (200, r#"{"data":[{"id":"test-model"}]}"#),
            (401, r#"{"error":{"message":"Invalid token"}}"#),
            (302, ""),
        ] {
            let listener = TcpListener::bind("127.0.0.1:0").unwrap();
            let address = listener.local_addr().unwrap();
            let server = std::thread::spawn(move || {
                let (mut socket, _) = listener.accept().unwrap();
                socket.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
                let mut bytes = Vec::new();
                loop {
                    let mut chunk = [0; 1024];
                    let count = socket.read(&mut chunk).unwrap();
                    assert!(count > 0);
                    bytes.extend_from_slice(&chunk[..count]);
                    if bytes.windows(4).any(|value| value == b"\r\n\r\n") { break; }
                }
                let request = String::from_utf8(bytes).unwrap().to_lowercase();
                assert!(request.starts_with("get /v1/models http/1.1"));
                assert!(request.contains("authorization: bearer local-test-key\r\n"));
                assert!(request.contains("x-goog-api-key: local-google-key\r\n"));
                let response = format!("HTTP/1.1 {status} Test\r\nContent-Type: application/json\r\nLocation: http://127.0.0.1:1/v1/models\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len());
                socket.write_all(response.as_bytes()).unwrap();
            });
            let response = tauri::async_runtime::block_on(query_model_list(
                format!("http://{address}/v1/models"),
                Some("Bearer local-test-key".into()),
                Some("local-google-key".into()),
                Some(5000),
            )).unwrap();
            server.join().unwrap();
            assert_eq!(response.status, status);
            assert_eq!(response.body, body);
            assert_eq!(response.content_type, "application/json");
        }
    }

    #[test]
    #[ignore = "explicit live connectivity check, requires network"]
    fn live_public_pricing_and_missing_key() {
        tauri::async_runtime::block_on(async {
            let pricing = query_model_list("https://api.tu-zi.com/api/pricing".into(), None, None, Some(20000)).await.unwrap();
            assert_eq!(pricing.status, 200);
            let payload: serde_json::Value = serde_json::from_str(&pricing.body).unwrap();
            assert_eq!(payload["success"], true);
            assert!(!payload["data"].as_array().unwrap().is_empty());
            let models = query_model_list("https://api.tu-zi.com/v1/models".into(), None, None, Some(15000)).await.unwrap();
            assert_eq!(models.status, 401);
        });
    }
}
