import subprocess
import os

img_src = "src/assets/images/dingalan_login_bg_1790825738823.jpg"
out_video = "public/dingalan_bg_video.mp4"

# Generate a high quality MP4 video that pans/zooms smoothly, 10 seconds looped, 1080p, H.264
# using zoompan or smooth animation filter
cmd = [
    "ffmpeg", "-y",
    "-loop", "1",
    "-i", img_src,
    "-vf", "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(max(zoom,pzoom)+0.0008,1.15)':d=250:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25",
    "-t", "10",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    out_video
]
subprocess.run(cmd, check=True)
print("Done creating video! Size:", os.path.getsize(out_video))
