# src/result_aggregator.py

class ResultAggregator:

    def combine_results(self, skin_result):
        health_score = 100
        detections   = (skin_result or {}).get('detections', [])

        severity_map = {
            'Acne':           30,
            'Blackheads':     20,
            'Dark-Spots':     25,
            'Dry-Skin':       15,
            'Enlarged-Pores': 10,
            'Eyebags':        15,
            'Oily-Skin':      15,
            'Skin-Redness':   20,
            'Whiteheads':     20,
            'Wrinkles':       20,
            'Normal':          0,
        }

        if detections:
            primary_class = skin_result.get('predicted_class', 'Normal')
            health_score -= severity_map.get(primary_class, 0)
            for det in detections[1:]:
                health_score -= severity_map.get(det['class'], 0) // 2
        elif skin_result and skin_result.get('severity_score'):
            health_score -= skin_result['severity_score']

        health_score = max(0, min(100, int(health_score)))

        if health_score >= 80:
            status = "Excellent"
        elif health_score >= 60:
            status = "Good"
        elif health_score >= 40:
            status = "Fair"
        else:
            status = "Needs Attention"

        detected_issues = []
        for det in detections:
            if det['class'] != 'Normal':
                detected_issues.append({
                    'type':       'skin',
                    'condition':  det['class'],
                    'confidence': det['confidence'],
                    'bbox':       det.get('bbox', []),
                })

        # FIX: recommendations grouped by condition
        # Format: [{ condition, display_name, tips: [...] }]
        grouped_recommendations = []
        display_names = {
            'Acne':           'Acne',
            'Blackheads':     'Blackheads',
            'Dark-Spots':     'Dark Spots',
            'Dry-Skin':       'Dry Skin',
            'Enlarged-Pores': 'Enlarged Pores',
            'Eyebags':        'Eyebags',
            'Oily-Skin':      'Oily Skin',
            'Skin-Redness':   'Skin Redness',
            'Whiteheads':     'Whiteheads',
            'Wrinkles':       'Fine Lines & Wrinkles',
            'Normal':         'Normal Skin',
        }

        conditions_to_recommend = [d['class'] for d in detections] if detections else \
                                   [skin_result.get('predicted_class', 'Normal')] if skin_result else ['Normal']

        for condition in conditions_to_recommend:
            tips = self._get_tips(condition)
            if tips:
                grouped_recommendations.append({
                    'condition':    condition,
                    'display_name': display_names.get(condition, condition),
                    'tips':         tips,
                })

        # Also keep flat list for backward compatibility
        flat_recommendations = []
        for group in grouped_recommendations:
            flat_recommendations.extend(group['tips'])

        return {
            'skin_analysis':             skin_result,
            'detected_issues':           detected_issues,
            'overall_health_score':      health_score,
            'health_status':             status,
            'recommendations':           flat_recommendations,
            'grouped_recommendations':   grouped_recommendations,
        }

    def _get_tips(self, condition):
        tips = {
            'Acne':           ["Use a gentle salicylic acid cleanser",
                               "Avoid touching your face",
                               "Use non-comedogenic moisturizer"],
            'Blackheads':     ["Exfoliate 2-3 times per week",
                               "Use clay masks weekly",
                               "Use a pore-cleansing strip once a week"],
            'Dark-Spots':     ["Apply vitamin C serum daily",
                               "Use broad-spectrum SPF 30+ sunscreen",
                               "Consider niacinamide for brightening"],
            'Dry-Skin':       ["Use a hydrating moisturizer twice daily",
                               "Drink at least 8 glasses of water per day",
                               "Avoid hot showers and harsh soaps"],
            'Enlarged-Pores': ["Use a clay mask weekly",
                               "Apply a niacinamide serum",
                               "Cleanse thoroughly but gently twice daily"],
            'Eyebags':        ["Get 7-8 hours of sleep per night",
                               "Apply cold compresses in the morning",
                               "Reduce salt intake to minimize fluid retention"],
            'Oily-Skin':      ["Use oil-free non-comedogenic products",
                               "Cleanse your face twice daily",
                               "Use a light water-based moisturizer"],
            'Skin-Redness':   ["Use fragrance-free gentle products",
                               "Apply aloe vera gel to soothe irritation",
                               "Avoid extreme temperatures and spicy food"],
            'Whiteheads':     ["Use a gentle exfoliating cleanser",
                               "Apply salicylic acid or benzoyl peroxide",
                               "Avoid squeezing or picking whiteheads"],
            'Wrinkles':       ["Use a retinol cream at night",
                               "Moisturize daily with hyaluronic acid",
                               "Wear SPF 30+ sunscreen every day"],
            'Normal':         ["Maintain your current skincare routine",
                               "Use sunscreen daily",
                               "Stay hydrated"],
        }
        return tips.get(condition, ["Maintain healthy skincare habits"])