# Visual LaTeX Editor

This project is a WYSIWYG-like editor for creating LaTeX documents. It allows writing text and formulas in text boxes, adding images by dragging and dropping, moving all elements visually, and then export the layout as a single `.tex` file.

## How It Works

The editor uses a combination of HTML, CSS, and JavaScript for the front-end interface. jQuery UI is used for draggable and resizable elements.

The backend is a simple Node.js server `server.js`, which compiles the input inside a textbox at each keystroke and displays compiled TeX as png, as well as handles image uploads.

## Prerequisites

*   Node.js and npm
*   A LaTeX distribution with `latex` and `dvipng` commands available in your system's PATH.

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/latex-editor.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd latex-editor
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

## Usage

1.  Start the server:
    ```bash
    npm start
    ```
2.  Open your web browser and go to `http://localhost:3000`.

## Contributing

Contributions are welcome! Please feel free to submit a pull request.
