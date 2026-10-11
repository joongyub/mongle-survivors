# index.html → artifact.html (아티팩트 게시용: doctype/html/head/body 태그 제거)
import re, pathlib
d = pathlib.Path(__file__).parent
s = (d / 'index.html').read_text()
s = re.sub(r'<!doctype html>\s*', '', s, flags=re.I)
for t in ['<html lang="ko">', '</html>', '<head>', '</head>', '<body>', '</body>']:
    s = s.replace(t, '')
s = re.sub(r'<meta charset="utf-8">\s*', '', s)
s = re.sub(r'<meta name="viewport"[^>]*>\s*', '', s)
# 제목을 맨 위로
m = re.search(r'<title>.*?</title>\s*', s); s = m.group(0) + s.replace(m.group(0), '')
(d / 'artifact.html').write_text(s.strip() + '\n')
print('ok')
