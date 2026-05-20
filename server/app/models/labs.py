"""Lab models for validation and import."""
from pydantic import BaseModel
from typing import List


class NodeMapping(BaseModel):
    """Mapping between EVE-NG node and game node."""
    eveng_node_id: str
    game_node_id: str


class LabImportValidationRequest(BaseModel):
    """Request schema for lab import validation."""
    lab_name: str
    lab_path: str  # EVE-NG lab path
    node_mappings: List[NodeMapping]
