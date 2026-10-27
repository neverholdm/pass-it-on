from rest_framework.exceptions import PermissionDenied, ValidationError


class DemoIdentityRequired(PermissionDenied):
    default_detail = "Sign in with a Pass It On demo identity."


class DemoActionDenied(PermissionDenied):
    default_detail = "This action is not allowed for the current demo identity."


class DemoGiverOnly(PermissionDenied):
    default_detail = "Only the Item Giver can perform this action."


class DemoApplicantOnly(PermissionDenied):
    default_detail = "Only the Item Requester can perform this action."


class DemoLocalOnly(PermissionDenied):
    default_detail = "Identity switching is available from this computer only."


class DemoSessionRoleSwitchOnly(PermissionDenied):
    default_detail = "Only a Pass It On demo session can switch identities."


class DemoActionUnavailableError(ValidationError):
    default_detail = "This action is not available in the current demo state."
