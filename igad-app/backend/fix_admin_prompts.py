import re

with open("app/handlers/admin_prompts.py", "r") as f:
    content = f.read()

# Replace exception blocks
content = re.sub(
    r'    except ValueError as e:\n        raise HTTPException\(status_code=status\.HTTP_404_NOT_FOUND, detail=str\(e\)\)\n    except Exception as e:\n        logger\.error',
    '    except HTTPException:\n        raise\n    except ValueError as e:\n        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))\n    except Exception as e:\n        logger.error',
    content
)

# Fix others as well
content = re.sub(
    r'    except Exception as e:\n        logger\.error\(f"Error getting prompts',
    '    except HTTPException:\n        raise\n    except Exception as e:\n        logger.error(f"Error getting prompts',
    content
)

content = re.sub(
    r'    except Exception as e:\n        logger\.error\(f"Error listing prompts',
    '    except HTTPException:\n        raise\n    except Exception as e:\n        logger.error(f"Error listing prompts',
    content
)

content = re.sub(
    r'    except Exception as e:\n        logger\.error\(f"Error creating prompt',
    '    except HTTPException:\n        raise\n    except Exception as e:\n        logger.error(f"Error creating prompt',
    content
)

content = re.sub(
    r'    except Exception as e:\n        logger\.error\(f"Error updating prompt',
    '    except HTTPException:\n        raise\n    except Exception as e:\n        logger.error(f"Error updating prompt',
    content
)

content = re.sub(
    r'    except Exception as e:\n        logger\.error\(f"Error deleting prompt',
    '    except HTTPException:\n        raise\n    except Exception as e:\n        logger.error(f"Error deleting prompt',
    content
)

content = re.sub(
    r'    except Exception as e:\n        logger\.error\(f"Error previewing prompt',
    '    except HTTPException:\n        raise\n    except Exception as e:\n        logger.error(f"Error previewing prompt',
    content
)

content = re.sub(
    r'    except Exception as e:\n        logger\.error\(f"Error getting active prompt',
    '    except HTTPException:\n        raise\n    except Exception as e:\n        logger.error(f"Error getting active prompt',
    content
)

content = re.sub(
    r'    except Exception as e:\n        logger\.error\(f"Error adding comment',
    '    except HTTPException:\n        raise\n    except Exception as e:\n        logger.error(f"Error adding comment',
    content
)

content = re.sub(
    r'    except Exception as e:\n        logger\.error\(f"Error getting history',
    '    except HTTPException:\n        raise\n    except Exception as e:\n        logger.error(f"Error getting history',
    content
)


with open("app/handlers/admin_prompts.py", "w") as f:
    f.write(content)
