from app.services.matching import reconcile


def test_reconcile_amount_and_ref_match():
    transactions = [
        {
            "id": "t1",
            "date": "2026-02-01",
            "description": "Payment INV-1001 to VendorX",
            "reference": "INV-1001",
            "amount": 100.00,
            "type": "debit",
            "extractionConfidence": 0.9,
        }
    ]
    invoices = [
        {
            "id": "i1",
            "invoiceNumber": "INV-1001",
            "vendorName": "VendorX",
            "invoiceDate": "2026-01-30",
            "dueDate": "2026-02-05",
            "totalAmount": 100.00,
            "subtotal": 90.00,
            "tax": 10.00,
            "purchaseOrder": None,
            "originalFilename": "inv.pdf",
            "fieldConfidences": {},
            "overallConfidence": 0.9,
        }
    ]

    result = reconcile(transactions, invoices)
    assert result["summary"]["matchedCount"] == 1
    assert result["matched"][0]["transaction"]["id"] == "t1"
    assert result["matched"][0]["invoice"]["id"] == "i1"
