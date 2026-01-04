from __future__ import annotations

import math


def compute_similarity_score(mean_abs_diff: float, common_count: int) -> float:
    if common_count <= 0:
        return 0.0
    score = max(0.0, (1.0 - (mean_abs_diff / 4.0))) * 100.0
    return round(score, 1)


def compute_pearson_from_aggregates(
    count: int,
    sum_x: float,
    sum_y: float,
    sum_x2: float,
    sum_y2: float,
    sum_xy: float,
) -> float | None:
    if count < 5:
        return None

    mean_x = sum_x / count
    mean_y = sum_y / count
    numerator = sum_xy - (count * mean_x * mean_y)
    denom_x = sum_x2 - (count * mean_x * mean_x)
    denom_y = sum_y2 - (count * mean_y * mean_y)
    denom = math.sqrt(denom_x * denom_y)
    if denom == 0:
        return None
    return numerator / denom
