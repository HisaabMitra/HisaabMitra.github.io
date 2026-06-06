from flask import Flask, jsonify
from flask_cors import CORS
import win32print

app = Flask(__name__)
CORS(app)

@app.route("/printers", methods=["GET"])
def get_printers():
    try:
        printers = []

        flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS

        installed_printers = win32print.EnumPrinters(flags)

        default_printer = win32print.GetDefaultPrinter()

        for printer in installed_printers:

            printer_name = printer[2]

            printers.append({
                "name": printer_name,
                "default": printer_name == default_printer
            })

        return jsonify({
            "success": True,
            "printers": printers
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        })

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
