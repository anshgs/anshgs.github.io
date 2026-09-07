"""Write responsive gallery thumbnails before the browser sees the HTML."""
import html
import re
from html.parser import HTMLParser

SIZES = '(max-width: 700px) calc((100vw - 42px) / 2), (max-width: 1100px) calc((100vw - 320px) / 3), calc((100vw - 344px) / 4)'

class ImageAttributes(HTMLParser):
    def handle_starttag(self, tag, attrs):
        self.attrs = dict(attrs)

def attributes(tag):
    parser = ImageAttributes()
    parser.feed(tag)
    return parser.attrs

def full_image_url(tag):
    attrs = attributes(tag)
    return attrs.get('data-full-src') or attrs.get('src', '')

def optimize_gallery_markup(markup):
    index = 0
    def replace(match):
        nonlocal index
        tag = match.group(0)
        if tag.startswith('<!--'):
            return tag
        attrs = attributes(tag)
        full = attrs.get('data-full-src') or attrs.get('src', '')
        if not full.startswith('https://lh3.googleusercontent.com/pw/'):
            return tag
        base = re.sub(r'=w\d+(?:-h\d+)?[^/]*$', '', full)
        escape = lambda value: html.escape(value, quote=True)
        srcset = ', '.join(f'{base}=w{width} {width}w' for width in (320, 480, 640, 960))
        loading = 'eager' if index < 4 else 'lazy'
        priority = 'high' if index < 2 else 'auto'
        index += 1
        return (f'<img src="{escape(base)}=w480" data-full-src="{escape(full)}" '
                f'srcset="{escape(srcset)}" sizes="{SIZES}" '
                f'loading="{loading}" decoding="async" fetchpriority="{priority}" '
                f'referrerpolicy="no-referrer" alt="{escape(attrs.get("alt") or "Season photo")}">')
    return re.sub(r'<!--.*?-->|<img\b[^>]*>', replace, markup, flags=re.S | re.I)
