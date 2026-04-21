class ResultAggregator:
    def combine_results(self, skin_result):
        health_score = 100

        if skin_result and skin_result.get('severity_score'):
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

        if skin_result and skin_result.get('predicted_class') != 'normal':
            detected_issues.append({
                'type': 'skin',
                'condition': skin_result['predicted_class'],
                'confidence': skin_result.get('confidence', 0)
            })

        recommendations = self._get_skin_recommendations(
            skin_result['predicted_class']
        ) if skin_result else []

        return {
            'skin_analysis': skin_result,
            'detected_issues': detected_issues,
            'overall_health_score': health_score,
            'health_status': status,
            'recommendations': recommendations
        }

    def _get_skin_recommendations(self, condition):
        recs = {
            'acne': ["Use salicylic acid cleanser", "Avoid touching face"],
            'blackheads': ["Exfoliate regularly", "Use clay masks"],
            'darkspots': ["Use vitamin C", "Apply sunscreen"],
            'dry': ["Use moisturizer", "Drink water"],
            'hyperpigmentation': ["Use niacinamide", "Use sunscreen"],
            'oily': ["Use oil-free products", "Cleanse twice daily"]
        }
        return recs.get(condition, ["Maintain healthy skincare"])