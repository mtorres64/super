import os
import io
import re
from typing import Optional, Tuple
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from googleapiclient.errors import HttpError
from PIL import Image

_SCOPES = ['https://www.googleapis.com/auth/drive.file']
_MAX_DIM = 800
_MAX_KB = 200


def _get_service():
    creds = Credentials(
        token=None,
        refresh_token=os.environ['GOOGLE_REFRESH_TOKEN'],
        client_id=os.environ['GOOGLE_CLIENT_ID'],
        client_secret=os.environ['GOOGLE_CLIENT_SECRET'],
        token_uri='https://oauth2.googleapis.com/token',
        scopes=_SCOPES,
    )
    creds.refresh(Request())
    return build('drive', 'v3', credentials=creds, cache_discovery=False)


def _compress(content: bytes) -> bytes:
    img = Image.open(io.BytesIO(content))
    if img.mode in ('RGBA', 'P', 'LA'):
        img = img.convert('RGB')
    if max(img.size) > _MAX_DIM:
        img.thumbnail((_MAX_DIM, _MAX_DIM), Image.LANCZOS)
    buf = io.BytesIO()
    quality = 85
    while quality >= 20:
        buf.seek(0)
        buf.truncate()
        img.save(buf, format='JPEG', quality=quality, optimize=True)
        if buf.tell() <= _MAX_KB * 1024:
            break
        quality -= 15
    return buf.getvalue()


def extract_drive_file_id(url: str) -> Optional[str]:
    """Extrae el file_id de una URL de Google Drive. Devuelve None si no es una URL de Drive."""
    if not url or 'drive.google.com' not in url:
        return None
    match = re.search(r'[?&]id=([a-zA-Z0-9_-]+)', url)
    return match.group(1) if match else None


def upload_image(content: bytes, filename: str) -> Tuple[str, str]:
    """
    Comprime y sube una imagen a la carpeta de Drive configurada.
    Devuelve (url_thumbnail, file_id). Síncrona — usar con run_in_executor.
    """
    compressed = _compress(content)
    service = _get_service()
    folder_id = os.environ['GOOGLE_DRIVE_FOLDER_ID']

    file_meta = {'name': filename, 'parents': [folder_id]}
    media = MediaIoBaseUpload(io.BytesIO(compressed), mimetype='image/jpeg', resumable=False)
    file = service.files().create(body=file_meta, media_body=media, fields='id').execute()
    file_id = file['id']

    service.permissions().create(
        fileId=file_id,
        body={'type': 'anyone', 'role': 'reader'},
    ).execute()

    url = f"https://drive.google.com/thumbnail?id={file_id}&sz=w800"
    return url, file_id


def delete_file(file_id: str) -> None:
    """Elimina un archivo de Drive por su file_id. Ignora el error 404 si ya no existe."""
    try:
        service = _get_service()
        service.files().delete(fileId=file_id).execute()
    except HttpError as e:
        if e.resp.status != 404:
            raise
