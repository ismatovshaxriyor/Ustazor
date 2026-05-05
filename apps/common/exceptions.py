from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return None

    payload = response.data
    if isinstance(payload, dict):
        data = dict(payload)
        detail = data.get("detail")
        if detail is None:
            if "non_field_errors" in data and data["non_field_errors"]:
                detail = data["non_field_errors"][0]
            else:
                detail = "So`rovni bajarishda xatolik yuz berdi."
            data["detail"] = detail
        data["status_code"] = response.status_code
        response.data = data
        return response

    if isinstance(payload, list):
        response.data = {
            "detail": "Validatsiya xatoligi.",
            "errors": payload,
            "status_code": response.status_code,
        }
        return response

    response.data = {
        "detail": str(payload),
        "status_code": response.status_code,
    }
    return response
