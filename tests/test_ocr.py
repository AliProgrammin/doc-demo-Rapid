from app.services.ocr import parse_bank_transactions, parse_invoice


def test_parse_bank_transactions_table_like_rows():
    text = """
    2026-02-01 ACH PAYMENT INV-1001 100.00
    2026-02-02 REFUND VENDORX (25.00)
    """
    txs = parse_bank_transactions(text)
    assert len(txs) == 2
    assert txs[0]["amount"] == 100.0
    assert txs[0]["type"] == "debit"
    assert txs[1]["amount"] == 25.0
    assert txs[1]["type"] == "credit"


def test_parse_invoice_extracts_fields():
    text = """
    Vendor X LLC
    Invoice Number: INV-2026-88
    Invoice Date: 2026-02-05
    Due Date: 2026-02-20
    Total Amount: 1,245.50
    """
    invoice = parse_invoice(text, "inv.pdf", 0.9)
    assert invoice["invoiceNumber"] == "INV-2026-88"
    assert invoice["invoiceDate"] == "2026-02-05"
    assert invoice["dueDate"] == "2026-02-20"
    assert invoice["totalAmount"] == 1245.50
