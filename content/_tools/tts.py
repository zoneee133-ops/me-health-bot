import sys, wave, torch, numpy as np
from torch.package import PackageImporter
M="/Users/robert/Desktop/Projects/ME/models/v4_ru.pt"
imp = PackageImporter(M); model = imp.load_pickle("tts_models","model"); model.to("cpu")
text=sys.argv[1]; spk=sys.argv[2]; out=sys.argv[3]; SR=48000
au = model.apply_tts(text=text, speaker=spk, sample_rate=SR, put_accent=True, put_yo=True)
pcm = (au.clamp(-1,1).numpy()*32767).astype('<i2')
with wave.open(out,'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("wrote", out, len(pcm)/SR, "s")
