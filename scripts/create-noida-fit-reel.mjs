import sharp from "sharp";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(process.argv[2] || join(root, "public/reels/noida-fit-discover.mp4"));
const width = 1080;
const height = 1920;
const duration = 3;
const tmp = await mkdtemp(join(tmpdir(), "noida-fit-reel-"));
const running = join(root, "public/images/landing/running.webp");
const community = join(root, "public/images/landing/community.webp");
const logo = join(root, "public/images/logo.png");

const esc = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const text = ({ value, x = 72, y, size, color = "#ffffff", weight = 700, spacing = 0, opacity = 1 }) =>
  `<text x="${x}" y="${y}" fill="${color}" fill-opacity="${opacity}" font-family="Arial, Helvetica, sans-serif" font-size="${size}px" font-weight="${weight}" letter-spacing="${spacing}px">${esc(value)}</text>`;
const svg = (body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`);

const scene1Overlay = svg(`
  <defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#090a0f" stop-opacity=".82"/><stop offset=".42" stop-color="#090a0f" stop-opacity=".22"/><stop offset="1" stop-color="#090a0f" stop-opacity=".52"/></linearGradient></defs>
  <rect width="1080" height="1920" fill="#090a0f" opacity=".24"/><rect width="1080" height="1920" fill="url(#shade)"/>
  ${text({ value: "NOIDA / GREATER NOIDA", y: 238, size: 34, color: "#9ddc2e", spacing: 2 })}
  ${text({ value: "FIND YOUR", y: 805, size: 104, spacing: -1 })}
  ${text({ value: "PEOPLE.", y: 925, size: 114, spacing: -1 })}
  ${text({ value: "Discover the city in motion.", x: 76, y: 1080, size: 40, weight: 400, opacity: .94 })}
`);

const scene2Overlay = svg(`
  <defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#090a0f" stop-opacity=".5"/><stop offset=".55" stop-color="#090a0f" stop-opacity=".28"/><stop offset="1" stop-color="#090a0f" stop-opacity=".62"/></linearGradient></defs>
  <rect width="1080" height="1920" fill="#090a0f" opacity=".22"/><rect width="1080" height="1920" fill="url(#shade)"/>
  ${text({ value: "RUN. RIDE. TRAIN.", y: 250, size: 34, color: "#9ddc2e", spacing: 2 })}
  ${text({ value: "MOVE", y: 805, size: 118, spacing: -1 })}
  ${text({ value: "TOGETHER.", y: 925, size: 106, spacing: -1 })}
  ${text({ value: "Open workouts. Group sessions. Good energy.", x: 76, y: 1085, size: 37, weight: 400, opacity: .94 })}
`);

const scene3 = svg(`
  <rect width="1080" height="1920" fill="#090a0f"/>
  <rect width="1080" height="18" fill="#9ddc2e"/>
  <rect x="72" y="420" width="936" height="2" fill="#333c57"/>
  ${text({ value: "YOUR NEXT", y: 550, size: 36, color: "#9ddc2e", spacing: 2 })}
  ${text({ value: "SESSION", y: 770, size: 118, spacing: -1 })}
  ${text({ value: "STARTS HERE.", y: 895, size: 88, spacing: -1 })}
  ${text({ value: "Find the track, park or court that gets you out the door.", x: 76, y: 1090, size: 36, weight: 400, color: "#f8fafc", opacity: .88 })}
`);

const scene4Base = svg(`
  <rect width="1080" height="1920" fill="#090a0f"/>
  <rect width="1080" height="18" fill="#9ddc2e"/>
  ${text({ value: "DISCOVER. SAVE. SHOW UP.", y: 710, size: 50, spacing: 1 })}
  ${text({ value: "Fitness, closer than you think.", x: 76, y: 830, size: 38, weight: 400, color: "#94a3b8" })}
  ${text({ value: "@noida.fit", x: 76, y: 1600, size: 42, color: "#9ddc2e" })}
`);

async function makeImage(source, overlay, filename) {
  await sharp(source)
    .resize(width, height, { fit: "cover", position: "centre" })
    .composite([{ input: overlay }])
    .png()
    .toFile(join(tmp, filename));
}

try {
  await mkdir(dirname(output), { recursive: true });
  await makeImage(running, scene1Overlay, "scene-1.png");
  await makeImage(community, scene2Overlay, "scene-2.png");
  await sharp(scene3).png().toFile(join(tmp, "scene-3.png"));

  const logoBuffer = await sharp(logo).resize({ width: 620 }).png().toBuffer();
  await sharp(scene4Base)
    .composite([{ input: logoBuffer, left: 230, top: 235 }])
    .png()
    .toFile(join(tmp, "scene-4.png"));

  const filter = `
    [0:v]fps=30,trim=duration=3,setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.25,fade=t=out:st=2.7:d=0.3[s1];
    [1:v]fps=30,trim=duration=3,setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.25,fade=t=out:st=2.7:d=0.3[s2];
    [2:v]fps=30,trim=duration=3,setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.25,fade=t=out:st=2.7:d=0.3[s3];
    [3:v]fps=30,trim=duration=3,setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.25,fade=t=out:st=2.7:d=0.3[s4];
    [s1][s2]xfade=transition=fade:duration=0.4:offset=2.6[sc12];
    [sc12][s3]xfade=transition=fade:duration=0.4:offset=5.2[sc123];
    [sc123][s4]xfade=transition=fade:duration=0.4:offset=7.8,format=yuv420p[outv]
  `;
  const ffmpeg = spawnSync("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error",
    "-loop", "1", "-i", join(tmp, "scene-1.png"),
    "-loop", "1", "-i", join(tmp, "scene-2.png"),
    "-loop", "1", "-i", join(tmp, "scene-3.png"),
    "-loop", "1", "-i", join(tmp, "scene-4.png"),
    "-filter_complex", filter,
    "-map", "[outv]", "-an", "-r", "30", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output,
  ], { stdio: "inherit" });

  if (ffmpeg.status !== 0) throw new Error(`ffmpeg exited with status ${ffmpeg.status}`);
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=width,height,codec_name,pix_fmt", "-of", "default=noprint_wrappers=1", output], { encoding: "utf8" });
  process.stdout.write(probe.stdout);
  console.log(`Created ${output}`);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
