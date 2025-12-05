"""
A simple example to show tensor shape on debugger
"""

import sys
from _pydevd_bundle.pydevd_extension_api import StrPresentationProvider
from .pydevd_helpers import find_mod_attr


class PyTorchTensorShapeStr:
    def can_provide(self, type_object, type_name):
        torch_tensor = find_mod_attr("torch", "Tensor")
        return torch_tensor is not None and issubclass(type_object, torch_tensor)

    def get_str(self, val):
        dim = val.dim()
        if dim == 0:
            return str(val)
        elif dim == 1:
            return f"{val.shape[0]}: {val}"
        return f"{list(val.shape)}: {val}"


if not sys.platform.startswith("java"):
    StrPresentationProvider.register(PyTorchTensorShapeStr)
