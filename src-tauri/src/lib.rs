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

#[derive(Serialize, Deserialize)]
pub struct ImageMetadata {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub created: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
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
fn list_subfolders(path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&path);
    if !path.is_dir() {
        return Err("Provided path is not a directory".into());
    }

    let mut subfolders = Vec::new();
    let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
    
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        
        if file_type.is_dir() {
            if let Some(name) = entry.file_name().to_str() {
                subfolders.push(name.to_string());
            }
        }
    }

    Ok(subfolders)
}

#[tauri::command]
async fn move_image(source_path: String, target_folder: String) -> Result<String, String> {
    println!("Copying file from {} to {}", source_path, target_folder);
    
    let source_path = Path::new(&source_path);
    let target_folder = Path::new(&target_folder);
    
    if !source_path.exists() {
        println!("Source file does not exist: {}", source_path.display());
        return Err("Source file does not exist".into());
    }
    
    if !target_folder.is_dir() {
        println!("Target folder does not exist: {}", target_folder.display());
        return Err("Target folder does not exist".into());
    }
    
    let filename = source_path.file_name()
        .ok_or("Invalid source path")?
        .to_str()
        .ok_or("Invalid filename encoding")?;
    
    let target_path = target_folder.join(filename);
    
    println!("Target path: {}", target_path.display());
    
    // Check if target file already exists
    if target_path.exists() {
        println!("Target file already exists: {}", target_path.display());
        return Err("Target file already exists".into());
    }
    
    // Copy the file instead of moving it
    match fs::copy(source_path, target_path) {
        Ok(_) => {
            println!("File copied successfully");
            Ok("File copied successfully".to_string())
        },
       Err(e) => {
            println!("Error copying file: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
fn get_image_metadata(path: String) -> Result<ImageMetadata, String> {
    let file = File::open(&path).map_err(|e| e.to_string())?;
    let metadata = file.metadata().map_err(|e| e.to_string())?;
    
    let name = Path::new(&path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    
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
    
    Ok(ImageMetadata {
        path,
        name,
        size: metadata.len(),
        created: created_string,
        width: None, // We'll get this from the frontend
        height: None,
    })
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
            get_image_metadata,
            list_subfolders,
            move_image,
            list_filenames_in_folder,
            list_images_in_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
