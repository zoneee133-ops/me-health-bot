#!/bin/bash
set -e
D="$(cd "$(dirname "$0")" && pwd)"
FF="/Users/robert/Desktop/Projects/ME/node_modules/ffmpeg-static/ffmpeg"
FPS=30
scene(){ local base=$1 dur=$2 z0=$3 z1=$4 px=$5 py=$6 out=$7 cap=$8
  local frames=$(python3 -c "print(int($dur*$FPS))")
  local zexpr="$z0+($z1-$z0)*on/$frames"
  local vf="zoompan=z='$zexpr':x='$px':y='$py':d=1:s=1080x1920:fps=$FPS"
  if [ -n "$cap" ]; then
    "$FF" -y -loop 1 -t "$dur" -i "$D/$base" -loop 1 -t "$dur" -i "$D/$cap" \
      -filter_complex "[0:v]$vf[bg];[1:v]format=rgba,fade=t=in:st=0.15:d=0.3:alpha=1[cp];[bg][cp]overlay=0:0" \
      -c:v libx264 -pix_fmt yuv420p -r $FPS "$D/$out" -loglevel error
  else
    "$FF" -y -loop 1 -t "$dur" -i "$D/$base" -vf "$vf" -c:v libx264 -pix_fmt yuv420p -r $FPS "$D/$out" -loglevel error
  fi
}
#     база          сек  зум          центр                                       выход  подпись
scene 01_blank.png  2.9  1.00 1.14 "iw/2-(iw/zoom/2)"      "ih/2-(ih/zoom/2)"       s1.mp4 cap_q.png
scene 01_blank.png  1.9  1.90 2.20 "iw*0.70-(iw/zoom/2)"   "ih*0.5792-(ih/zoom/2)"  s2.mp4
scene 02_app.png    2.8  1.05 1.00 "iw/2-(iw/zoom/2)"      "ih/2-(ih/zoom/2)"       s3.mp4 cap_shot.png
scene 03_app.png    5.6  1.00 1.09 "iw/2-(iw/zoom/2)"      "ih/2-(ih/zoom/2)"       s4.mp4 cap_calm.png
scene 04_end.png    4.0  1.00 1.05 "iw/2-(iw/zoom/2)"      "ih/2-(ih/zoom/2)"       s5.mp4
printf "file '%s'\n" $D/s1.mp4 $D/s2.mp4 $D/s3.mp4 $D/s4.mp4 $D/s5.mp4 > "$D/list.txt"
"$FF" -y -f concat -safe 0 -i "$D/list.txt" -c copy "$D/_j0.mp4" -loglevel error
# держим последний кадр ещё 0.7с, чтобы закадр закончил фразу
"$FF" -y -i "$D/_j0.mp4" -vf "tpad=stop_mode=clone:stop_duration=0.7" -c:v libx264 -pix_fmt yuv420p -r $FPS "$D/_joined.mp4" -loglevel error
T=$("$FF" -i "$D/_joined.mp4" 2>&1 | grep -oE "Duration: [0-9:.]+" | cut -d' ' -f2)
echo "мастер-длина: $T"

# --- дорожка озвучки: 4 сегмента kseniya, нормализация -16 LUFS ---
"$FF" -y \
  -i "$D/vo/1.wav" -i "$D/vo/2.wav" -i "$D/vo/3.wav" -i "$D/vo/4.wav" \
  -filter_complex "\
   [0:a]adelay=150|150[a0];\
   [1:a]adelay=4700|4700[a1];\
   [2:a]adelay=7450|7450[a2];\
   [3:a]adelay=12950|12950[a3];\
   [a0][a1][a2][a3]amix=inputs=4:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[vo]" \
  -map "[vo]" -t 16.9 "$D/_vo.wav" -loglevel error

"$FF" -y -i "$D/_joined.mp4" -i "$D/_vo.wav" \
  -vf "fade=t=in:st=0:d=0.4,fade=t=out:st=16.4:d=0.5" \
  -af "afade=t=out:st=16.4:d=0.5" \
  -c:v libx264 -profile:v high -level 4.0 -crf 20 -pix_fmt yuv420p \
  -c:a aac -b:a 160k -movflags +faststart \
  "$D/reel_eozinofily_voice.mp4" -loglevel error
echo "готово: $D/reel_eozinofily_voice.mp4"
