from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api", tags=["models"])

_DEFAULTS = {
    "invoice": {"modelId": "prebuilt-invoice", "isCustom": False},
    "bank_statement": {"modelId": "prebuilt-layout", "isCustom": False},
}

_state = {
    "invoice": dict(_DEFAULTS["invoice"]),
    "bank_statement": dict(_DEFAULTS["bank_statement"]),
}


@router.get('/models')
def list_models():
    models = [
        {
            "modelId": "prebuilt-invoice",
            "isCustom": False,
            "createdDateTime": None,
            "expirationDateTime": None,
            "description": "Prebuilt invoice model",
            "applicableEntityType": "invoice",
            "isActive": _state["invoice"]["modelId"] == "prebuilt-invoice",
            "activeFor": "invoice" if _state["invoice"]["modelId"] == "prebuilt-invoice" else None,
        },
        {
            "modelId": "prebuilt-layout",
            "isCustom": False,
            "createdDateTime": None,
            "expirationDateTime": None,
            "description": "Prebuilt layout model",
            "applicableEntityType": "bank_statement",
            "isActive": _state["bank_statement"]["modelId"] == "prebuilt-layout",
            "activeFor": "bank_statement" if _state["bank_statement"]["modelId"] == "prebuilt-layout" else None,
        },
    ]
    # include active custom models
    for entity in ("invoice", "bank_statement"):
        current = _state[entity]
        if current["modelId"] not in {"prebuilt-invoice", "prebuilt-layout"}:
            models.append({
                "modelId": current["modelId"],
                "isCustom": True,
                "createdDateTime": None,
                "expirationDateTime": None,
                "description": f"Custom {entity} model",
                "applicableEntityType": entity,
                "isActive": True,
                "activeFor": entity,
            })
    return {"models": models, "activeConfig": _state}


@router.post('/models/activate')
def activate_model(payload: dict):
    entity = payload.get("entityType")
    model_id = payload.get("modelId")
    if entity not in {"invoice", "bank_statement"}:
        raise HTTPException(status_code=400, detail="entityType must be 'invoice' or 'bank_statement'")
    if not isinstance(model_id, str) or not model_id:
        raise HTTPException(status_code=400, detail="modelId is required")
    _state[entity] = {"modelId": model_id, "isCustom": model_id not in {"prebuilt-invoice", "prebuilt-layout"}}
    return {"success": True, "entityType": entity, **_state[entity]}


@router.post('/models/reset')
def reset_model(payload: dict):
    entity = payload.get("entityType")
    if entity not in {"invoice", "bank_statement"}:
        raise HTTPException(status_code=400, detail="entityType must be 'invoice' or 'bank_statement'")
    _state[entity] = dict(_DEFAULTS[entity])
    return {"success": True, "entityType": entity, **_state[entity]}
