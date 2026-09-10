#!/bin/bash
# Собирает финальные озвученные реелы: рендер Remotion + закадр Svetlana + эмбиент-подушка.
set -e
D="$(cd "$(dirname "$0")" && pwd)"
FF="/Users/robert/Desktop/Projects/ME/node_modules/ffmpeg-static/ffmpeg"
cd "$D"

# mux <CompId> <outfile> <totalSec> <seg1:delay1> <seg2:delay2> ...
mux(){
  local comp=$1 outname=$2 total=$3; shift 3
  local sil="out/_${comp}.mp4"
  [ -f "$sil" ] || { echo "нет $sil — рендерю"; npx remotion render "$comp" "$sil" --log=error; }

  # --- закадр: сегменты с задержкой, микс, нормализация -16 LUFS ---
  local inputs=() filt="" labels=""
  local n=0
  for pair in "$@"; do
    local seg=${pair%%:*} del=${pair##*:}
    inputs+=(-i "out/vo/${seg}.mp3")
    local ms=$(python3 -c "print(int(${del}*1000))")
    filt+="[${n}:a]adelay=${ms}|${ms},apad=pad_dur=0.15[v${n}];"
    labels+="[v${n}]"
    n=$((n+1))
  done
  "$FF" -y "${inputs[@]}" -filter_complex \
    "${filt}${labels}amix=inputs=${n}:normalize=0:dropout_transition=0,loudnorm=I=-16:TP=-1.5:LRA=11[vo]" \
    -map "[vo]" -t "$total" "out/vo/_${comp}_vo.wav" -loglevel error

  # --- эмбиент-подушка: 4 низких синуса, тремоло, фильтры, эхо, фейды ---
  "$FF" -y -filter_complex "\
    sine=frequency=110:sample_rate=48000:duration=${total},volume=0.20[b0];\
    sine=frequency=164.81:sample_rate=48000:duration=${total},volume=0.12[b1];\
    sine=frequency=220:sample_rate=48000:duration=${total},volume=0.10[b2];\
    sine=frequency=261.63:sample_rate=48000:duration=${total},volume=0.07[b3];\
    [b0][b1][b2][b3]amix=inputs=4:normalize=0,tremolo=f=0.2:d=0.35,\
    highpass=f=80,lowpass=f=700,aecho=0.8:0.7:60:0.3,\
    afade=t=in:st=0:d=1.2,afade=t=out:st=$(python3 -c "print(${total}-1.6)"):d=1.6,\
    volume=0.9[bed]" \
    -map "[bed]" -t "$total" "out/vo/_${comp}_bed.wav" -loglevel error

  # --- дакинг подушки под голос ~6:1, итоговый микс -16 LUFS ---
  "$FF" -y -i "out/vo/_${comp}_bed.wav" -i "out/vo/_${comp}_vo.wav" -filter_complex "\
    [0:a][1:a]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=320[bd];\
    [bd][1:a]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[mix]" \
    -map "[mix]" -t "$total" "out/vo/_${comp}_mix.wav" -loglevel error

  # --- финальный мукс с видео ---
  "$FF" -y -i "$sil" -i "out/vo/_${comp}_mix.wav" \
    -c:v libx264 -profile:v high -crf 19 -pix_fmt yuv420p \
    -c:a aac -b:a 176k -ar 48000 -ac 2 -movflags +faststart -shortest \
    "out/${outname}.mp4" -loglevel error
  echo "готово: out/${outname}.mp4  ($total c)"
}

mux ReelDecode      reel-a-rasshifrovka  19.0  a1:0.5 a2:6.6 a3:11.2
mux ReelHandwriting reel-b-pocherk       19.0  b1:0.4 b2:5.7 b3:11.8
mux ReelShowMom     reel-c-pokazhi-mame  20.6  c1:0.5 c2:6.4 c4:13.0
mux ReelAboveNormal reel-d-vyshe-normy   16.0  d1:0.4 d2:5.2 d3:10.6

mux ReelFerritin    reel-e-ferritin      24.4  e1:0.4 e2:6.3  e3:13.0 e4:20.3
mux ReelReport      reel-f-report        25.8  f1:0.4 f2:7.3  f3:16.0 f4:21.0
mux ReelMail        reel-g-mail          24.4  g1:0.4 g2:6.6  g3:13.0 g4:20.4
mux ReelScan        reel-h-scan          27.1  h1:0.4 h2:7.0  h3:14.6 h4:21.7
