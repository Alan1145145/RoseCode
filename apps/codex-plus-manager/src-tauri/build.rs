fn main() {
    // Tauri 默认只追踪配置；原生资源也需显式追踪，否则替换图标后增量构建仍可能沿用旧 EXE 图标。
    for icon in [
        "icons/icon.ico",
        "icons/icon.png",
        "icons/icon-macos.png",
        "icons/tray-template.png",
    ] {
        println!("cargo:rerun-if-changed={icon}");
    }
    let windows = tauri_build::WindowsAttributes::new()
        .app_manifest(include_str!("windows-app-manifest.xml"));
    let attrs = tauri_build::Attributes::new().windows_attributes(windows);
    tauri_build::try_build(attrs).expect("failed to run Tauri build script");
}
