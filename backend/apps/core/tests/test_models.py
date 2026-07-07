from apps.core.models import BaseModel, SoftDeleteModel, TimeStampedModel, UUIDModel


def test_base_model_is_abstract():
    assert BaseModel._meta.abstract is True
    assert UUIDModel._meta.abstract is True
    assert TimeStampedModel._meta.abstract is True
    assert SoftDeleteModel._meta.abstract is True


def test_base_model_has_expected_fields():
    field_names = {f.name for f in BaseModel._meta.get_fields()}
    assert "id" in field_names
    assert "created_at" in field_names
    assert "updated_at" in field_names
    assert "is_deleted" in field_names
    assert "deleted_at" in field_names
