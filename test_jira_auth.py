import urllib.request
import base64
import json

domain = 'https://hotung.atlassian.net'
email = 'luongtiendung.work@gmail.com'
token = 'ATATT3xFfGF0xVf3MzbeCgP5zjiTUKW4Icm40r3vRs8NqeAAJcAdfjEh-hYdkFnojd3147vw4x5yZHKzzugKlNh9atUdOjIgILhuAZKzSzfALWSHabcBJ6JACoI6pSMtfEoswQlpxG_BHFy6jdZgvp0qU9TxqIzgNebLewzxHCUXOGjhVLxqs9Y=06AA4BA4'

auth_str = f'{email}:{token}'
b64_auth = base64.b64encode(auth_str.encode('utf-8')).decode('utf-8')

url = f'{domain}/rest/api/3/myself'
req = urllib.request.Request(url)
req.add_header('Authorization', f'Basic {b64_auth}')
req.add_header('Accept', 'application/json')

print("Đang kết nối tới Jira...")
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read())
        print('\n✅ THÀNH CÔNG! Đăng nhập với tên:', data.get('displayName'))
except Exception as e:
    import urllib.error
    if isinstance(e, urllib.error.HTTPError):
        print(f'\n❌ LỖI: {e.code} {e.reason}')
        print("Chi tiết từ Jira:", e.read().decode())
    else:
        print('\n❌ LỖI:', e)
