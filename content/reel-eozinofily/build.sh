#!/bin/bash
# Собирает вертикальный ролик 1080x1920 из отрендеренных PNG. Правки таймингов — здесь.
set -e
D="$(cd "$(dirname "$0")" && pwd)"
FF="$(node -p 'require("ffmpeg-static")')"
FPS=30
scene(){ # scene <база> <длит> <zoom_от> <zoom_до> <точка_x> <точка_y> <выход> [подпись]
  local base=$1 dur=$2 z0=$3 z1=$4 px=$5 py=$6 out=$7 cap=$8
  local frames=$(python3 -c "print(int($dur*$FPS))")
  local zexpr="$z0+($z1-$z0)*on/$frames"
  local inputs=(-loop 1 -t "$dur" -i "$D/$base")
  local vf="zoompan=z='$zexpr':x='$px':y='$py':d=1:s=1080x1920:fps=$FPS"
  if [ -n "$cap" ]; then
    inputs+=(-loop 1 -t "$dur" -i "$D/$cap")
    vf="[0:v]$vf[bg];[1:v]format=rgba,fade=t=in:st=0.15:d=0.3:alpha=1[cp];[bg][cp]overlay=0:0"
    "$FF" -y "${inputs[@]}" -filter_complex "$vf" -c:v libx264 -pix_fmt yuv420p -r $FPS "$D/$out" -loglevel error
  else
    "$FF" -y "${inputs[@]}" -vf "$vf" -c:v libx264 -pix_fmt yuv420p -r $FPS "$D/$out" -loglevel error
  fi
}
#     база          сек  зум:от->до   центр кадра                 выход      подпись
scene 01_blank.png  2.8  1.00 1.14 "iw/2-(iw/zoom/2)" "ih/2-(ih/zoom/2)"      s1.mp4 cap_q.png
scene 01_blank.png  1.9  1.90 2.20 "iw*0.70-(iw/zoom/2)" "ih*0.5792-(ih/zoom/2)" s2.mp4
scene 02_app.png    2.6  1.05 1.00 "iw/2-(iw/zoom/2)" "ih/2-(ih/zoom/2)"      s3.mp4 cap_shot.png
scene 03_app.png    4.4  1.00 1.09 "iw/2-(iw/zoom/2)" "ih/2-(ih/zoom/2)"      s4.mp4 cap_calm.png
scene 04_end.png    3.2  1.00 1.05 "iw/2-(iw/zoom/2)" "ih/2-(ih/zoom/2)"      s5.mp4
printf "file '%s'\n" $D/s1.mp4 $D/s2.mp4 $D/s3.mp4 $D/s4.mp4 $D/s5.mp4 > "$D/list.txt"
"$FF" -y -f concat -safe 0 -i "$D/list.txt" -c copy "$D/_joined.mp4" -loglevel error
# лёгкое затемнение на входе и выходе — без него старт выглядит рубленым
"$FF" -y -i "$D/_joined.mp4" -vf "fade=t=in:st=0:d=0.4,fade=t=out:st=14.5:d=0.4" \
  -c:v libx264 -profile:v high -level 4.0 -crf 20 -pix_fmt yuv420p -movflags +faststart \
  "$D/reel_eozinofily.mp4" -loglevel error
echo "готово: $D/reel_eozinofily.mp4"
