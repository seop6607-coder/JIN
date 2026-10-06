#!/usr/bin/env python3
"""
사이트를 파일 하나로 묶는다 (미리보기·배포용). CSS와 스크립트를 모두 인라인한다.
  python3 tools/bundle.py <출력 경로>
출력은 <title>, 글꼴 링크, <style>, 본문 순서이며 <html>/<head> 뼈대는 넣지 않는다
(Artifact 게시 시 뼈대가 자동으로 붙는다).
"""
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()


def main():
    if len(sys.argv) != 2:
        sys.exit('사용법: python3 tools/bundle.py <출력 경로>')
    out = sys.argv[1]
    html = read('index.html')
    title = re.search(r'<title>.*?</title>', html, re.S).group(0)
    links = '\n'.join(re.findall(r'<link rel="preconnect"[^>]*>|<link rel="stylesheet" href="https://fonts[^>]*>', html))
    css = read('css/style.css')
    body = re.search(r'<body>(.*)</body>', html, re.S).group(1)

    def inline(m):
        return '<script>\n' + read(m.group(1)).replace('</script', '<\\/script') + '\n</script>'

    body = re.sub(r'<script src="([^"]+)"></script>', inline, body)
    if '<script src' in body:
        sys.exit('인라인하지 못한 스크립트가 남았습니다')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(title + '\n' + links + '\n<style>\n' + css + '\n</style>\n' + body)
    print('%s (%d KB)' % (out, os.path.getsize(out) // 1024))


if __name__ == '__main__':
    main()
