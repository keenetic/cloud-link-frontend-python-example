from functools import wraps
from flask import Flask, request, render_template, jsonify
from base64 import b64decode, b64encode
from typing import Optional
import requests

app = Flask(__name__, instance_relative_config=True)
# from flask app config
app.config.from_pyfile('config.py')
config: dict = app.config


def get_basic_creds() -> Optional[str]:
    auth_value = request.headers.get('Authorization')
    if auth_value and auth_value.startswith("Basic "):
        auth_value = auth_value[6:]
        return b64decode(auth_value).decode('utf-8')
    return None


def check_basic_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        creds = get_basic_creds()
        if not creds:
            return 'Please authenticate', 401, {'WWW-Authenticate': 'Basic realm="Login Required"'}
        allowed_users = config.get('ALLOWEDUSERS')
        if allowed_users and isinstance(allowed_users, dict):
            for login, userdata in allowed_users.items():
                if isinstance(userdata, dict):
                    password = userdata.get('password')
                else:
                    continue
                if f'{login}:{password}' == creds:
                    return f(*args, **kwargs)
        return 'Authorization failed', 401
    return decorated_function


def get_user_name() -> Optional[str]:
    creds = get_basic_creds()
    if not creds:
        return None
    allowed_users = config.get('ALLOWEDUSERS')
    if allowed_users and isinstance(allowed_users, dict):
        for login, userdata in allowed_users.items():
            if isinstance(userdata, dict):
                password = userdata.get('password')
            else:
                continue
            if f'{login}:{password}' == creds:
                return userdata.get('name')
    return None


@app.route('/')
@check_basic_auth
def single_page():
    return render_template('page-default.html')


@app.route('/search')
@check_basic_auth
def search():

    # We need to pass name of current user to API
    user_name = get_user_name()

    license = request.args.get('license')
    if not license:
        return jsonify({"error": "missing license"})

    api_url = config.get('API_URL')
    api_login = config.get('API_BASIC_LOGIN')
    api_password = config.get('API_BASIC_PASSWORD')

    if api_url and api_login and api_password:
        auth_header = 'Basic ' + b64encode(f'{api_login}:{api_password}'.encode('utf-8')).decode('utf-8')
        try:
            return requests.get(
                f'{api_url}/search?license={license}',
                headers={'Authorization': auth_header}
            ).json()
        except:
            return jsonify({"error": "request failed"})

    else:
        return jsonify({"error": "misconfiguration"})

    pass


if __name__ == '__main__':
    app.run( host="0.0.0.0")
