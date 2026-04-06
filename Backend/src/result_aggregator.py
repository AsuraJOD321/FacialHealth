# src/result_aggregator.py
from .skin_analyzer import SkinAnalyzer
from .eye_analyzer import EyeAnalyzer

class ResultAggregator:
    def combine_results(self, skin_result, left_eye_result, right_eye_result):
        health_score = 100
        
        # Handle None values
        if skin_result is None:
            skin_result = {}
        if left_eye_result is None:
            left_eye_result = {}
        if right_eye_result is None:
            right_eye_result = {}
        
        # Subtract skin severity
        if skin_result.get('severity_score'):
            health_score -= skin_result['severity_score']
        
        # Subtract eye severity (only if not Normal)
        if left_eye_result.get('predicted_class') != 'Normal' and left_eye_result.get('severity_score'):
            health_score -= left_eye_result['severity_score']
        
        if right_eye_result.get('predicted_class') != 'Normal' and right_eye_result.get('severity_score'):
            health_score -= right_eye_result['severity_score']
        
        health_score = max(0, min(100, int(health_score)))
        
        # Determine health status
        if health_score >= 80:
            status = "Excellent"
        elif health_score >= 60:
            status = "Good"
        elif health_score >= 40:
            status = "Fair"
        else:
            status = "Needs Attention"
        
        # Collect detected issues
        detected_issues = []
        
        if skin_result.get('predicted_class') and skin_result['predicted_class'] != 'normal':
            detected_issues.append({
                'type': 'skin',
                'condition': skin_result['predicted_class'],
                'confidence': skin_result.get('confidence', 0)
            })
        
        if left_eye_result.get('predicted_class') and left_eye_result['predicted_class'] != 'Normal':
            detected_issues.append({
                'type': 'eye',
                'eye': 'left',
                'condition': left_eye_result['predicted_class'],
                'confidence': left_eye_result.get('confidence', 0)
            })
        
        if right_eye_result.get('predicted_class') and right_eye_result['predicted_class'] != 'Normal':
            detected_issues.append({
                'type': 'eye',
                'eye': 'right',
                'condition': right_eye_result['predicted_class'],
                'confidence': right_eye_result.get('confidence', 0)
            })
        
        # Collect recommendations
        all_recommendations = []
        
        if skin_result.get('predicted_class') and skin_result['predicted_class'] != 'normal':
            skin_recs = SkinAnalyzer().get_recommendations(skin_result['predicted_class'])
            all_recommendations.extend(skin_recs[:3])
        
        if left_eye_result.get('predicted_class') and left_eye_result['predicted_class'] != 'Normal':
            eye_recs = EyeAnalyzer().get_recommendations(left_eye_result['predicted_class'])
            all_recommendations.extend(eye_recs[:3])
        
        if right_eye_result.get('predicted_class') and right_eye_result['predicted_class'] != 'Normal':
            eye_recs = EyeAnalyzer().get_recommendations(right_eye_result['predicted_class'])
            all_recommendations.extend(eye_recs[:3])
        
        # Remove duplicates and limit to 5 recommendations
        unique_recs = []
        for rec in all_recommendations:
            if rec not in unique_recs:
                unique_recs.append(rec)
        
        return {
            'skin_analysis': skin_result if skin_result else None,
            'left_eye': left_eye_result if left_eye_result else None,
            'right_eye': right_eye_result if right_eye_result else None,
            'detected_issues': detected_issues,
            'overall_health_score': health_score,
            'health_status': status,
            'recommendations': unique_recs[:5]
        }