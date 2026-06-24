def is_valid_barcode(code: str) -> bool:
    """
    Valida códigos EAN-8, UPC-A (12 dígitos), EAN-13 e ITF-14 usando checksum GS1.
    Rechaza códigos internos (INT-xxx) y cualquier string no numérico.
    """
    if not code or not isinstance(code, str):
        return False
    code = code.strip()
    if not code.isdigit():
        return False
    n = len(code)
    if n not in (8, 12, 13, 14):
        return False
    digits = [int(d) for d in code]
    total = 0
    for i, d in enumerate(digits[:-1]):
        # Peso alternante desde el dígito más cercano al check digit
        pos_from_right = n - 1 - i
        weight = 3 if pos_from_right % 2 == 1 else 1
        total += d * weight
    check = (10 - total % 10) % 10
    return digits[-1] == check
