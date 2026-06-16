import os
import sys
from PIL import Image

def generate_icons(image_path):
    img = Image.open(image_path).convert("RGBA")
    
    # Web Icons
    web_dir = r"E:\Solar_Prophecy\web"
    os.makedirs(web_dir, exist_ok=True)
    img.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(web_dir, "icon-192.png"))
    img.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(web_dir, "icon-512.png"))

    # Android Mipmap Sizes
    sizes = {
        "mdpi": 48,
        "hdpi": 72,
        "xhdpi": 96,
        "xxhdpi": 144,
        "xxxhdpi": 192
    }
    
    res_dir = r"E:\Solar_Prophecy\android-app\src\main\res"
    for density, size in sizes.items():
        folder = os.path.join(res_dir, f"mipmap-{density}")
        os.makedirs(folder, exist_ok=True)
        
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(os.path.join(folder, "ic_launcher.png"))
        
        # For round icon, we'll just create a circular crop
        mask = Image.new("L", (size, size), 0)
        from PIL import ImageDraw
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, size, size), fill=255)
        
        round_img = resized.copy()
        round_img.putalpha(mask)
        round_img.save(os.path.join(folder, "ic_launcher_round.png"))

    # Remove anydpi-v26 XMLs to fallback to PNGs
    anydpi_dir = os.path.join(res_dir, "mipmap-anydpi-v26")
    if os.path.exists(anydpi_dir):
        for f in ["ic_launcher.xml", "ic_launcher_round.xml"]:
            p = os.path.join(anydpi_dir, f)
            if os.path.exists(p):
                os.remove(p)

if __name__ == "__main__":
    generate_icons(r"C:\Users\Kishore\.gemini\antigravity\brain\4af4a2b8-2e1d-4327-b630-e86bad912678\media__1781590523794.jpg")
    print("Icons generated successfully.")
