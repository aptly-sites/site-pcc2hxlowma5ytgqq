#!/usr/bin/env python3
"""Start the local preview with the same property detail handler as production."""

from os import execvp
from pathlib import Path


if __name__ == "__main__":
    execvp("node", ["node", str(Path(__file__).with_suffix(".mjs"))])
