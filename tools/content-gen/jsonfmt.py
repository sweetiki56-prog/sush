# One entry per line, like weapons.json: { "a": 1, "b": [1, 2], "c": { "d": 1 } }
import json
def inline(v):
    if isinstance(v, dict):
        return '{ ' + ', '.join(f'{json.dumps(k, ensure_ascii=False)}: {inline(x)}' for k, x in v.items()) + ' }' if v else '{}'
    if isinstance(v, list):
        return '[' + ', '.join(inline(x) for x in v) + ']'
    return json.dumps(v, ensure_ascii=False)
def table(d):
    return '{\n' + ',\n'.join(f'  {json.dumps(k, ensure_ascii=False)}: {inline(v)}' for k, v in d.items()) + '\n}\n'
