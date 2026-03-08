import re
with open("tests/test_vector_storage.py", "r") as f:
    content = f.read()

content = content.replace('"s3vectors": s3_client', '"s3": s3_client')

with open("tests/test_vector_storage.py", "w") as f:
    f.write(content)
