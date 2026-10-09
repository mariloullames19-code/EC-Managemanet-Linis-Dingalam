import cv2
import numpy as np
import subprocess
import os

img_path = 'src/assets/images/dingalan_lighthouse_natural_drone_1791512687510.jpg'
orig = cv2.imread(img_path)
if orig is None:
    raise FileNotFoundError("Image not found")

# Resize or pad to 4K for high quality rendering, e.g. 3840x2160
h, w = orig.shape[:2]
target_w, target_h = 3840, 2160
img_large = cv2.resize(orig, (target_w, target_h), interpolation=cv2.INTER_CUBIC)

fps = 30
duration = 10
total_frames = fps * directive_frames = fps * duration # 300 frames

out_file = 'public/dingalan_natural_drone.mp4'
temp_dir = '/tmp/drone_frames'
os.makedirs(temp_dir, exist_ok=True)

print("Generating frames with wave animation and sideways pan...")

for i in range(total_frames):
    t = i / float(fps)
    
    # Sideways pan offset (smooth sine or linear shift)
    # Pan horizontally across the 4K canvas smoothly
    pan_x = int(400 + 350 * np.sin(t * 2 * np.pi / 10.0))
    pan_y = int(150 + 100 * np.cos(t * 2 * np.pi / 10.0))
    
    # Crop 1920x1080 view from 3840x2160
    crop_w, crop_h = 1920, 1080
    
    # Ensure bounds
    x1 = max(0, min(target_w - crop_w, int(target_w * 0.25 + pan_x)))
    y1 = max(0, min(target_h - crop_h, int(target_h * 0.25 + pan_y)))
    x2 = x1 + crop_w
    y2 = y1 + crop_h
    
    frame = img_large[y1:y2, x1:x2].copy()
    
    # Add dynamic wave rippling effect on ocean/water regions
    # Create a subtle wave displacement on the lower half or blue regions
    rows, cols = frame.shape[:2]
    
    # Mesh grid for wave distortion
    # We apply horizontal wave displacement based on time and vertical position
    for r in range(rows):
        if r > rows * 0.3: # mostly sea and shore
            # wave offset
            offset = int(4.0 * np.sin(t * 8.0 + r * 0.05))
            if offset != 0:
                frame[r] = np.roll(frame[r], offset, axis=0) # shift pixels horizontally
                
    # Write frame
    frame_path = os.path.join(temp_dir, f'frame_{i:04d}.jpg')
    cv2.imwrite(frame_path, frame, [int(cv2.IMWRITE_JPEG_QUALITY), 95])

print("Frames generated. Encoding to MP4 with FFmpeg...")
cmd = [
    'ffmpeg', '-y',
    '-framerate', str(fps),
    '-i', os.path.join(temp_dir, 'frame_%04d.jpg'),
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    out_file
]
subprocess.run(cmd, check=True)
print("Wave video successfully created! Size:", os.path.getsize(out_file))
