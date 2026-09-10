#!/bin/bash
# Финальные озвученные реелы: Remotion silent + закадр Svetlana (последовательно, без наездов) + слышимая муз. подушка.
set -e
D="$(cd "$(dirname "$0")" && pwd)"; cd "$D"
FF="/Users/robert/Desktop/Projects/ME/node_modules/ffmpeg-static/ffmpeg"
dur(){ "$FF" -i "$1" 2>&1 | grep -oE 'Duration: [0-9:.]+' | cut -d' ' -f2 | awk -F: '{print ($1*3600)+($2*60)+$3}'; }

# mux <CompId> <outfile> <seg1> <seg2> ...   (тайминги считаются сами)
mux(){
  local comp=$1 outname=$2; shift 2
  local segs=("$@")
  # 1) последовательная раскладка закадра
  local pos=0.4 inputs=() filt="" labels="" n=0 total
  for seg in "${segs[@]}"; do
    local sd; sd=$(dur "out/vo/${seg}.mp3")
    local ms; ms=$(python3 -c "print(int(${pos}*1000))")
    inputs+=(-i "out/vo/${seg}.mp3")
    filt+="[${n}:a]adelay=${ms}|${ms}[v${n}];"; labels+="[v${n}]"; n=$((n+1))
    pos=$(python3 -c "print(round(${pos}+${sd}+0.55,2))")
  done
  total=$(python3 -c "print(round(${pos}+1.2,2))")
  local frames; frames=$(python3 -c "import math;print(math.ceil(${total}*30)+6)")

  # 2) silent-видео (длина задаётся в Root.tsx, подгонена под закадр)
  local sil="out/_${comp}.mp4"
  npx remotion render "$comp" "$sil" --log=error

  # 3) закадр — последовательно, split для дакинга
  "$FF" -y "${inputs[@]}" -filter_complex \
    "${filt}${labels}amix=inputs=${n}:normalize=0:dropout_transition=0,loudnorm=I=-14:TP=-1.5:LRA=11,apad=whole_dur=${total},asplit=2[voA][voB]" \
    -map "[voA]" -t "$total" "out/vo/_${comp}_vo.wav" -loglevel error

  # 4) микс: слышимая подушка + лёгкий дакинг под голос
  local fo; fo=$(python3 -c "print(round(${total}-2.2,2))")
  "$FF" -y "${inputs[@]}" -stream_loop -1 -i assets/bed.wav -filter_complex "\
    ${filt}${labels}amix=inputs=${n}:normalize=0:dropout_transition=0,loudnorm=I=-14:TP=-1.5:LRA=11,apad=whole_dur=${total},asplit=2[voA][voB];\
    [${n}:a]atrim=0:${total},asetpts=PTS-STARTPTS,volume=0.5,afade=t=in:st=0:d=1.5,afade=t=out:st=${fo}:d=2.2[bed];\
    [bed][voA]sidechaincompress=threshold=0.06:ratio=3:attack=25:release=450[bd];\
    [bd][voB]amix=inputs=2:normalize=0,alimiter=limit=0.95[mix]" \
    -map "[mix]" -t "$total" "out/vo/_${comp}_mix.wav" -loglevel error

  # 5) мукс
  "$FF" -y -i "$sil" -i "out/vo/_${comp}_mix.wav" \
    -c:v libx264 -profile:v high -crf 19 -pix_fmt yuv420p \
    -c:a aac -b:a 176k -ar 48000 -ac 2 -movflags +faststart -shortest \
    "out/${outname}.mp4" -loglevel error
  echo "готово: ${outname}  ${total}c  ${frames}f"
}

mux ReelDecode      reel-a-rasshifrovka  a1 a2 a3
mux ReelHandwriting reel-b-pocherk       b1 b2 b3
mux ReelShowMom     reel-c-pokazhi-mame  c1 c2 c4
mux ReelAboveNormal reel-d-vyshe-normy   d1 d2 d3
mux ReelFerritin    reel-e-ferritin      e1 e2 e3 e4
mux ReelReport      reel-f-report        f1 f2 f3 f4
mux ReelMail        reel-g-mail          g1 g2 g3 g4
mux ReelScan        reel-h-scan          h1 h2 h3 h4
