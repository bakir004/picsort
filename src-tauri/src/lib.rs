use std::io::Read;
use std::fs::File;
use std::fs;
use std::path::Path;
use serde::{Serialize, Deserialize};
use base64::Engine;

#[derive(Serialize, Deserialize)]
pub struct ImageFile {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub created: String,
}

fn is_image_file(filename: &str) -> bool {
    let ext = Path::new(filename)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    matches!(ext.as_str(), "jpg" | "jpeg" | "png" | "gif" | "bmp" | "webp" | "tiff" | "svg")
}

#[tauri::command]
fn list_images_in_folder(folder_path: String) -> Result<Vec<ImageFile>, String> {
    let path = Path::new(&folder_path);
    if !path.is_dir() {
        return Err("Provided path is not a directory".into());
    } 

    let mut image_files = Vec::new();

    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        
        if file_type.is_file() {
            if let Some(name) = entry.file_name().to_str() {
                if is_image_file(name) {
                    let full_path = entry.path().to_string_lossy().to_string();
                    let metadata = entry.metadata().map_err(|e| e.to_string())?;
                    
                    // Get creation time, fallback to modified time if creation time is not available
                    let created_time = metadata
                        .created()
                        .or_else(|_| metadata.modified())
                        .map_err(|e| e.to_string())?;
                    
                    let created_iso = created_time
                        .duration_since(std::time::UNIX_EPOCH)
                        .map_err(|e| e.to_string())?
                        .as_secs();
                    
                    // Convert to ISO string format
                    let created_string = chrono::DateTime::from_timestamp(created_iso as i64, 0)
                        .unwrap_or_else(|| chrono::Utc::now())
                        .to_rfc3339();
                    
                    image_files.push(ImageFile {
                        name: name.to_string(),
                        path: full_path,
                        size: metadata.len(),
                        created: created_string,
                    });
                }
            }
        }
    }

    Ok(image_files)
}

#[tauri::command]
fn list_filenames_in_folder(folder_path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&folder_path);
    if !path.is_dir() {
        return Err("Provided path is not a directory".into());
    } 

    let mut filenames = Vec::new();

    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        if file_type.is_file() {
            if let Some(name) = entry.file_name().to_str() {
                filenames.push(name.to_string());
            }
        }
    }

    Ok(filenames)
}

#[tauri::command]
fn read_image_as_base64(path: String) -> Result<String, String> {
    let mut file = File::open(&path).map_err(|e| e.to_string())?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
    let encoded = base64::engine::general_purpose::STANDARD.encode(&buffer);
    Ok(encoded)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            read_image_as_base64,
            list_filenames_in_folder,
            list_images_in_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
