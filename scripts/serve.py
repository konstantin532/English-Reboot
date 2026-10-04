"""English Reboot — локальный сервер для запуска на Windows/macOS/Linux.

Запуск: python scripts/serve.py [--open] [--port 8000]
(English_Reboot.bat и «запуск тихий.vbs» вызывают его сами.)

Почему не `python -m http.server`:
- на Windows он берёт MIME-типы из реестра, и .js часто отдаётся как text/plain —
  тогда не регистрируется Service Worker и браузер долго показывает старую версию;
- у него нет Cache-Control, поэтому после обновления файлов браузер мог брать старые;
- лаунчер открывал браузер раньше, чем сервер успевал запуститься.

Порт всегда 8000: прогресс хранится в браузере отдельно для каждого адреса,
смена порта «потеряла» бы его. Если порт занят (сервер уже запущен) —
просто открываем приложение.
"""
import argparse
import errno
import http.server
import os
import socketserver
import sys
import threading
import webbrowser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.mp3': 'audio/mpeg',
    '.txt': 'text/plain; charset=utf-8',
}


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, **MIME}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        return MIME.get(ext) or super().guess_type(path)

    def end_headers(self):
        # Всегда сверяться с диском: обновлённые файлы видны сразу
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, fmt, *args):  # тише в консоли: только ошибки
        if args and str(args[1]).startswith(('4', '5')):
            sys.stderr.write('  %s %s\n' % (args[1], args[0]))


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = False  # иначе на Windows два сервера могут сесть на один порт


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=8000)
    ap.add_argument('--open', action='store_true', help='открыть приложение в браузере')
    a = ap.parse_args()
    url = 'http://localhost:%d/' % a.port

    try:
        httpd = Server(('127.0.0.1', a.port), Handler)
    except OSError as e:
        if e.errno in (errno.EADDRINUSE, 10048):  # 10048 — WSAEADDRINUSE на Windows
            print('Сервер уже запущен — открываю', url)
            if a.open:
                webbrowser.open(url)
            return
        raise

    print('=' * 46)
    print('  English Reboot:', url)
    print('  Остановить: закройте это окно или Ctrl+C')
    print('=' * 46)
    if a.open:
        # браузер открываем, когда сервер уже слушает порт
        threading.Timer(0.3, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
