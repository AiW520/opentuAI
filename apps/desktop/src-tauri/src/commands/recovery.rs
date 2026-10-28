use serde::Serialize;
use std::time::Duration;

const MAX_RESPONSE_BYTES: usize = 256 * 1024;
const HOSTS: &[&str] = &[
    "api.tu-zi.com", "apius.tu-zi.com", "apicdn.tu-zi.com",
    "bus.tu-zi.com", "bus2.tu-zi.com", "bus3.tu-zi.com", "business.tu-zi.com",
    "api.sydney-ai.com", "api.ourzhishi.top", "apisz.ourzhishi.top",
];

#[derive(Serialize)]
pub struct RecoveryResponse {
    status: u16,
    body: String,
}

fn validate_url(input: &str) -> Result<reqwest::Url, String> {
    let url = reqwest::Url::parse(input).map_err(|_| "Invalid recovery URL")?;
    let query: Vec<_> = url.query_pairs().collect();
    if url.scheme() != "https"
        || !HOSTS.contains(&url.host_str().unwrap_or_default())
        || url.port().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.path() != "/log/get-request"
        || url.fragment().is_some()
        || query.len() != 1
        || query[0].0 != "id"
        || query[0].1.is_empty()
        || query[0].1.len() > 191
        || !query[0].1.bytes().all(|byte| (0x21..=0x7e).contains(&byte))
    {
        return Err("Invalid recovery URL".into());
    }
    Ok(url)
}

#[tauri::command]
pub async fn query_image_recovery(url: String, authorization: String) -> Result<RecoveryResponse, String> {
    let url = validate_url(&url)?;
    if !authorization.starts_with("Bearer ") || authorization.len() > 8192 {
        return Err("Invalid recovery authorization".into());
    }
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(20))
        .build().map_err(|_| "Unable to initialize recovery request")?;
    let mut response = client.get(url).header(reqwest::header::AUTHORIZATION, authorization)
        .send().await.map_err(|_| "Recovery request failed")?;
    let status = response.status().as_u16();
    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|_| "Recovery response failed")? {
        if bytes.len().saturating_add(chunk.len()) > MAX_RESPONSE_BYTES {
            return Err("Recovery response too large".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    let body = String::from_utf8(bytes).map_err(|_| "Invalid recovery response")?;
    Ok(RecoveryResponse { status, body })
}

#[cfg(test)]
mod tests {
    use super::{query_image_recovery, validate_url};

    #[test]
    fn only_accepts_exact_trusted_recovery_requests() {
        assert!(validate_url("https://api.tu-zi.com/log/get-request?id=abc-123").is_ok());
        for url in [
            "https://api.tu-zi.com.evil.test/log/get-request?id=x",
            "http://api.tu-zi.com/log/get-request?id=x",
            "https://api.tu-zi.com:444/log/get-request?id=x",
            "https://user@api.tu-zi.com/log/get-request?id=x",
            "https://api.tu-zi.com/other?id=x",
            "https://api.tu-zi.com/log/get-request?id=x&other=y",
        ] { assert!(validate_url(url).is_err(), "{url}"); }
    }

    #[test]
    #[ignore = "requires an explicit real recovery request and credential"]
    fn queries_real_recovery_endpoint() {
        let url = std::env::var("OPENTU_QA_RECOVERY_URL").expect("test URL required");
        let authorization = std::env::var("OPENTU_QA_RECOVERY_AUTH").expect("test credential required");
        let response = tauri::async_runtime::block_on(query_image_recovery(url, authorization))
            .expect("native recovery request failed");
        assert_eq!(response.status, 200);
        let payload: serde_json::Value = serde_json::from_str(&response.body).expect("invalid JSON");
        assert_eq!(payload["status"], "succeeded");
        assert!(payload["data"][0]["url"].as_str().is_some());
    }
}
