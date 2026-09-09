import sqlite3
import os
from flask import Flask, request, render_template_string

app = Flask(__name__)

def init_db():
    conn = sqlite3.connect('/tmp/ctf_database.db')
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE IF NOT EXISTS directives (id INTEGER PRIMARY KEY, title TEXT, classification TEXT);')
    cursor.execute('CREATE TABLE IF NOT EXISTS secrets (id INTEGER PRIMARY KEY, flag TEXT);')

    # Seed data
    cursor.execute('DELETE FROM directives;')
    cursor.execute('DELETE FROM secrets;')
    cursor.execute("INSERT INTO directives VALUES (1, 'Operation CyberShield', 'RESTRICTED');")
    cursor.execute("INSERT INTO directives VALUES (2, 'Defense Perimeter Protocol', 'CONFIDENTIAL');")
    cursor.execute("INSERT INTO directives VALUES (3, 'Satellite Telemetry Uplink', 'SECRET');")

    flag = os.environ.get('FLAG', 'CCCTF{development_only_example_sql}')
    cursor.execute("INSERT INTO secrets VALUES (1, ?);", (flag,))
    conn.commit()
    conn.close()

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Cyber Defense Directives Database</title>
    <style>
        body { background: #0b0f19; color: #00f2fe; font-family: monospace; padding: 40px; }
        .box { max-width: 600px; margin: 0 auto; border: 1px solid #1e293b; padding: 24px; border-radius: 8px; background: #050811; }
        input { background: #0f172a; border: 1px solid #334155; color: #fff; padding: 8px 12px; width: 80%; border-radius: 4px; }
        button { background: #00f2fe; color: #050811; border: none; padding: 8px 16px; font-weight: bold; cursor: pointer; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #1e293b; padding: 8px; text-align: left; }
    </style>
</head>
<body>
    <div class="box">
        <h2>[CYBER DEFENSE DIRECTIVE QUERY PORTAL]</h2>
        <form method="GET">
            <input type="text" name="search" placeholder="Search directive keyword..." value="{{ search_val }}">
            <button type="submit">QUERY</button>
        </form>

        {% if results %}
        <table>
            <tr><th>ID</th><th>Directive Title</th><th>Classification</th></tr>
            {% for r in results %}
            <tr><td>{{ r[0] }}</td><td>{{ r[1] }}</td><td>{{ r[2] }}</td></tr>
            {% endfor %}
        </table>
        {% endif %}
    </div>
</body>
</html>
"""

@app.route('/')
def index():
    search = request.args.get('search', '')
    results = []

    if search:
        conn = sqlite3.connect('/tmp/ctf_database.db')
        cursor = conn.cursor()
        # Vulnerable SQL query concatenation
        query = f"SELECT id, title, classification FROM directives WHERE title LIKE '%{search}%';"
        try:
            cursor.execute(query)
            results = cursor.fetchall()
        except Exception as e:
            results = [[0, f"DATABASE ERROR: {str(e)}", "ERROR"]]
        finally:
            conn.close()

    return render_template_string(HTML_TEMPLATE, search_val=search, results=results)

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=8080)
