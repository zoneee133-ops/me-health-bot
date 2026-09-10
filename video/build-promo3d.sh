#!/bin/bash
# Озвучка + эмбиент-подушка для Promo3D / Promo3DSquare.
set -e
D="$(cd "$(dirname "$0")" && pwd)"; cd "$D"
FF="/Users/robert/Desktop/Projects/ME/node_modules/ffmpeg-static/ffmpeg"
TOTAL=16.0

mux(){
  local comp=$1 outname=$2
  local sil="out/_${comp}.mp4"
  [ -f "$sil" ] || npx remotion render "$comp" "$sil" --log=error

  "$FF" -y -i out/vo/p3d_1.mp3 -i out/vo/p3d_2.mp3 -i out/vo/p3d_3.mp3 -filter_complex "\
    [0:a]adelay=500|500,apad=pad_dur=0.15[v0];\
    [1:a]adelay=6500|6500,apad=pad_dur=0.15[v1];\
    [2:a]adelay=12300|12300,apad=pad_dur=0.15[v2];\
    [v0][v1][v2]amix=inputs=3:normalize=0:dropout_transition=0,apad=whole_dur=${TOTAL},loudnorm=I=-16:TP=-1.5:LRA=11[vo]" \
    -map "[vo]" -t "$TOTAL" "out/vo/_${comp}_vo.wav" -loglevel error

  "$FF" -y -filter_complex "\
    sine=frequency=110:sample_rate=48000:duration=${TOTAL},volume=0.20[b0];\
    sine=frequency=164.81:sample_rate=48000:duration=${TOTAL},volume=0.12[b1];\
    sine=frequency=220:sample_rate=48000:duration=${TOTAL},volume=0.10[b2];\
    sine=frequency=261.63:sample_rate=48000:duration=${TOTAL},volume=0.07[b3];\
    [b0][b1][b2][b3]amix=inputs=4:normalize=0,tremolo=f=0.2:d=0.35,\
    highpass=f=80,lowpass=f=700,aecho=0.8:0.7:60:0.3,\
    afade=t=in:st=0:d=1.2,afade=t=out:st=$(python3 -c "print(${TOTAL}-1.6)"):d=1.6,\
    volume=0.9[bed]" \
    -map "[bed]" -t "$TOTAL" "out/vo/_${comp}_bed.wav" -loglevel error

  "$FF" -y -i "out/vo/_${comp}_bed.wav" -i "out/vo/_${comp}_vo.wav" -filter_complex "\
    [0:a][1:a]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=320[bd];\
    [bd][1:a]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[mix]" \
    -map "[mix]" -t "$TOTAL" "out/vo/_${comp}_mix.wav" -loglevel error

  "$FF" -y -i "$sil" -i "out/vo/_${comp}_mix.wav" \
    -c:v libx264 -profile:v high -crf 19 -pix_fmt yuv420p \
    -c:a aac -b:a 176k -ar 48000 -ac 2 -movflags +faststart -shortest \
    "out/${outname}.mp4" -loglevel error
  echo "готово: out/${outname}.mp4"
}

mux Promo3D       promo-3d
mux Promo3DSquare promo-3d-square
