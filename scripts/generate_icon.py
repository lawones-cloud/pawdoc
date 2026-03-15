#!/usr/bin/env python3
"""
PawDoc App Icon Generator
Generates a 1024x1024 icon with paw print + ECG heartbeat line
Colors: #2D6A4F background, #F4A261 ECG line, white paw print
"""

from PIL import Image, ImageDraw, ImageFilter
import math
import os

SIZE = 1024
BG_COLOR = (45, 106, 79)       # #2D6A4F Deep Forest Green
ECG_COLOR = (244, 162, 97)      # #F4A261 Warm Orange
PAW_COLOR = (255, 255, 255)     # White paw print
PAW_SHADOW = (30, 80, 55)       # Subtle shadow


def draw_rounded_rect(draw, x0, y0, x1, y1, radius, fill):
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    draw.ellipse([x0, y0, x0 + 2*radius, y0 + 2*radius], fill=fill)
    draw.ellipse([x1 - 2*radius, y0, x1, y0 + 2*radius], fill=fill)
    draw.ellipse([x0, y1 - 2*radius, x0 + 2*radius, y1], fill=fill)
    draw.ellipse([x1 - 2*radius, y1 - 2*radius, x1, y1], fill=fill)


def draw_paw(draw, cx, cy, scale=1.0, color=PAW_COLOR, alpha=255):
    """Draw a paw print centered at (cx, cy)"""
    
    # Main pad (large oval)
    pad_w = int(220 * scale)
    pad_h = int(180 * scale)
    draw.ellipse([
        cx - pad_w // 2,
        cy - pad_h // 2 + int(40 * scale),
        cx + pad_w // 2,
        cy + pad_h // 2 + int(40 * scale)
    ], fill=color)
    
    # Toe pads — 4 small ovals arranged in arc above main pad
    toe_configs = [
        (-110, -80, 70, 90),   # left outer
        (-40, -130, 70, 90),   # left inner
        (40, -130, 70, 90),    # right inner
        (110, -80, 70, 90),    # right outer
    ]
    for (tx, ty, tw, th) in toe_configs:
        tw2 = int(tw * scale)
        th2 = int(th * scale)
        ox = cx + int(tx * scale)
        oy = cy + int(ty * scale)
        draw.ellipse([ox - tw2//2, oy - th2//2, ox + tw2//2, oy + th2//2], fill=color)


def generate_ecg_points(img_size, y_center, amplitude, line_width):
    """Generate ECG heartbeat waveform points across the image width"""
    points = []
    w = img_size
    
    # ECG pattern segments (normalized 0..1 across width)
    # Baseline -> P wave -> baseline -> QRS complex -> T wave -> baseline
    segments = [
        # x_start, x_end, shape: "flat", "bump", "spike_up", "spike_down", "smooth_bump"
        (0.00, 0.10, "flat"),
        (0.10, 0.17, "bump", 0.15),        # P wave (small)
        (0.17, 0.30, "flat"),
        (0.30, 0.33, "spike_down", 0.2),   # Q dip
        (0.33, 0.38, "spike_up", 1.0),     # R spike (tall)
        (0.38, 0.41, "spike_down", 0.4),   # S dip
        (0.41, 0.55, "flat"),
        (0.55, 0.68, "smooth_bump", 0.35), # T wave
        (0.68, 1.00, "flat"),
    ]
    
    steps = w * 2  # 2 points per pixel for smoothness
    
    def get_y_at(x_norm):
        for seg in segments:
            x0, x1 = seg[0], seg[1]
            shape = seg[2]
            if x0 <= x_norm <= x1:
                t = (x_norm - x0) / (x1 - x0) if x1 > x0 else 0
                if shape == "flat":
                    return 0
                elif shape == "bump":
                    h = seg[3]
                    return -math.sin(t * math.pi) * h * amplitude
                elif shape == "smooth_bump":
                    h = seg[3]
                    return -math.sin(t * math.pi) * h * amplitude
                elif shape == "spike_up":
                    h = seg[3]
                    return -math.sin(t * math.pi) * h * amplitude
                elif shape == "spike_down":
                    h = seg[3]
                    return math.sin(t * math.pi) * h * amplitude
        return 0
    
    for i in range(steps + 1):
        x_norm = i / steps
        x = x_norm * w
        y = y_center + get_y_at(x_norm)
        points.append((x, y))
    
    return points


def create_icon(size=1024):
    # Create base image
    img = Image.new('RGBA', (size, size), BG_COLOR + (255,))
    draw = ImageDraw.Draw(img)
    
    cx = size // 2
    cy = size // 2
    
    # --- Draw paw print (slightly above center) ---
    paw_cx = cx
    paw_cy = cy - int(size * 0.03)
    paw_scale = size / 1024.0
    
    # Draw subtle shadow/depth for paw
    for offset in range(4, 0, -1):
        shadow_alpha = 30
        shadow_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow_img)
        draw_paw(shadow_draw, paw_cx + offset, paw_cy + offset, paw_scale, PAW_SHADOW, shadow_alpha)
        img = Image.alpha_composite(img, shadow_img)
    
    # Draw main paw
    draw = ImageDraw.Draw(img)
    draw_paw(draw, paw_cx, paw_cy, paw_scale, PAW_COLOR)
    
    # --- Draw ECG line ---
    ecg_y = cy + int(size * 0.22)   # Below center of paw
    ecg_amplitude = size * 0.13     # Height of ECG spikes
    ecg_thickness = max(6, int(size * 0.009))
    
    points = generate_ecg_points(size, ecg_y, ecg_amplitude, ecg_thickness)
    
    # Draw ECG line with thickness via multiple offsets
    for dy in range(-ecg_thickness // 2, ecg_thickness // 2 + 1):
        shifted = [(x, y + dy) for (x, y) in points]
        draw.line(shifted, fill=ECG_COLOR, width=1)
    
    # Draw a cleaner thick ECG using width param on segments
    for i in range(len(points) - 1):
        x0, y0 = points[i]
        x1, y1 = points[i+1]
        draw.line([(x0, y0), (x1, y1)], fill=ECG_COLOR, width=ecg_thickness)
    
    # Add subtle glow around ECG line
    glow_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)
    glow_thick = ecg_thickness + 8
    for i in range(len(points) - 1):
        x0, y0 = points[i]
        x1, y1 = points[i+1]
        glow_draw.line([(x0, y0), (x1, y1)], fill=ECG_COLOR + (60,), width=glow_thick)
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(radius=4))
    img = Image.alpha_composite(img, glow_img)
    
    # Final draw pass for crisp ECG on top
    draw = ImageDraw.Draw(img)
    for i in range(len(points) - 1):
        x0, y0 = points[i]
        x1, y1 = points[i+1]
        draw.line([(x0, y0), (x1, y1)], fill=ECG_COLOR + (255,), width=ecg_thickness)
    
    return img


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    assets_dir = os.path.join(script_dir, '..', 'assets')
    os.makedirs(assets_dir, exist_ok=True)
    
    print("Generating 1024x1024 app icon...")
    icon = create_icon(1024)
    
    # Convert to RGB for PNG output (no alpha channel needed)
    icon_rgb = Image.new('RGB', icon.size, BG_COLOR)
    icon_rgb.paste(icon, mask=icon.split()[3] if icon.mode == 'RGBA' else None)
    
    icon_path = os.path.join(assets_dir, 'icon.png')
    icon_rgb.save(icon_path, 'PNG', optimize=True)
    print(f"  Saved: {icon_path}")
    
    print("Generating adaptive-icon.png (Android)...")
    # Adaptive icon: slightly smaller paw centered on transparent background
    adaptive = Image.new('RGBA', (1024, 1024), BG_COLOR + (255,))
    draw = ImageDraw.Draw(adaptive)
    
    # Draw paw centered, slightly smaller for safe zone
    draw_paw(draw, 512, 490, 0.85, PAW_COLOR)
    
    # ECG line
    points = generate_ecg_points(1024, 512 + int(1024 * 0.22), 1024 * 0.13, max(6, int(1024 * 0.009)))
    ecg_thick = max(6, int(1024 * 0.009))
    for i in range(len(points) - 1):
        x0, y0 = points[i]
        x1, y1 = points[i+1]
        draw.line([(x0, y0), (x1, y1)], fill=ECG_COLOR, width=ecg_thick)
    
    adaptive_rgb = Image.new('RGB', adaptive.size, BG_COLOR)
    adaptive_rgb.paste(adaptive, mask=adaptive.split()[3])
    
    adaptive_path = os.path.join(assets_dir, 'adaptive-icon.png')
    adaptive_rgb.save(adaptive_path, 'PNG', optimize=True)
    print(f"  Saved: {adaptive_path}")
    
    print("Generating splash.png...")
    splash = Image.new('RGB', (1284, 2778), (250, 250, 250))  # iPhone 14 Pro Max size
    draw = ImageDraw.Draw(splash)
    
    # Draw the icon centered on splash
    icon_size = 400
    splash_icon = icon_rgb.resize((icon_size, icon_size), Image.LANCZOS)
    sx = (1284 - icon_size) // 2
    sy = (2778 - icon_size) // 2
    splash.paste(splash_icon, (sx, sy))
    
    splash_path = os.path.join(assets_dir, 'splash.png')
    splash.save(splash_path, 'PNG', optimize=True)
    print(f"  Saved: {splash_path}")
    
    print("\nAll assets generated successfully!")
    print(f"  icon.png: {os.path.getsize(icon_path):,} bytes")
    print(f"  adaptive-icon.png: {os.path.getsize(adaptive_path):,} bytes")
    print(f"  splash.png: {os.path.getsize(splash_path):,} bytes")


if __name__ == '__main__':
    main()
