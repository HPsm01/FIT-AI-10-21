import os, time, json, math, re
import numpy as np
import cv2
import boto3
import mediapipe as mp
import requests
from urllib.parse import unquote_plus
from datetime import datetime
# MediaPipe Pose 초기화
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,  # 속도 향상을 위해 1로 낮춤
    smooth_landmarks=True,
    enable_segmentation=False,
    smooth_segmentation=True,
    min_detection_confidence=0.1,  # 포즈 감지 성공률 향상을 위해 0.1로 낮춤
    min_tracking_confidence=0.1    # 포즈 감지 성공률 향상을 위해 0.1로 낮춤
)
mp_drawing = mp.solutions.drawing_utils
print("초기화 완료! - 속도 최적화 설정 적용")
# =========================
# AWS 설정
# =========================
queue_url = "https://sqs.ap-northeast-2.amazonaws.com/302263062071/fitvideo_analysis"
bucket_name = "thefit-bucket"
region_name = "ap-northeast-2"

sqs = boto3.client("sqs", region_name=region_name)
s3  = boto3.client("s3", region_name=region_name)

# =========================
# 서버 주소
# =========================
BASE_URL = "http://13.209.67.129:8000"

# 처리된 동영상 추적
processed_videos = set()
ROOT_PREFIX = "fitvideoresult"
# exercise_id -> 폴더명 매핑
EXERCISE_MAP = {
    1: "deadlift",
    2: "squat",
    3: "bench_press",
}

# =========================
# 유틸
# =========================
def get_message():
    response = sqs.receive_message(
        QueueUrl=queue_url,
        MaxNumberOfMessages=1,
        WaitTimeSeconds=10,
        VisibilityTimeout=30
    )
    return response.get("Messages", [None])[0]

def delete_message(receipt_handle):
    sqs.delete_message(QueueUrl=queue_url, ReceiptHandle=receipt_handle)

def download_video(object_key):
    filename = object_key.split("/")[-1]
    local_path = f"/content/{filename}"
    s3.download_file(bucket_name, object_key, local_path)
    print(f"📥 다운로드 완료: {local_path}")
    return local_path

def parse_filename(filename):

    base = filename
    if base.endswith(".mp4"):
        base = base[:-4]
    parts = base.split("_")
    if len(parts) < 4:
        return None, None, None, None
    try:
        uid = int(parts[0])
        uname = parts[1]
        load_kg = float(parts[2])
        timestamp = parts[3]
        return uid, uname, load_kg, timestamp
    except Exception:
        return None, None, None, None

def ts_to_yyyymmdd(ts: str) -> str:
    # ts: yyyyMMddHHmmssSSS(17자리) 가정 → 앞 8자리 날짜
    try:
        return ts[:8]
    except Exception:
        return ""

def get_next_set_no(user_id: int, user_name: str, yyyymmdd: str, exercise: str) -> int:
    prefix = f"{ROOT_PREFIX}/{user_id}_{user_name}/{yyyymmdd}/{exercise}/"
    continuation_token = None
    total = 0

    while True:
        kwargs = {"Bucket": bucket_name, "Prefix": prefix}
        if continuation_token:
            kwargs["ContinuationToken"] = continuation_token

        resp = s3.list_objects_v2(**kwargs)
        contents = resp.get("Contents", [])
        # 분석된 mp4만 카운트 (setX_*.mp4)
        for obj in contents:
            key = obj["Key"]
            if key.lower().endswith(".mp4") and "/set" in key:
                total += 1

        if resp.get("IsTruncated"):
            continuation_token = resp.get("NextContinuationToken")
        else:
            break

    # 기존 개수 + 1이 다음 set 번호
    return total + 1

# =========================
# 이미지 전처리
# =========================
def preprocess_frame(frame):
    """프레임 전처리로 포즈 감지 성능 향상"""
    try:
        # 1. 노이즈 제거
        denoised = cv2.fastNlMeansDenoisingColored(frame, None, 10, 10, 7, 21)
        
        # 2. 대비 향상 (CLAHE)
        lab = cv2.cvtColor(denoised, cv2.COLOR_BGR2LAB)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        lab[:,:,0] = clahe.apply(lab[:,:,0])
        enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        
        # 3. 선명도 향상
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        sharpened = cv2.filter2D(enhanced, -1, kernel)
        
        return sharpened
    except Exception as e:
        print(f"이미지 전처리 오류: {e}")
        return frame

# =========================
# 비디오 생성/분석
# =========================
def create_overlay_video(video_path, analysis_results, output_path):
    """분석 결과를 오버레이로 표시한 동영상 생성"""
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,  # 더 정확한 감지
        smooth_landmarks=True,  # 랜드마크 스무딩
        enable_segmentation=False,
        smooth_segmentation=True,
        min_detection_confidence=0.01,  # 극도로 관대한 임계값
        min_tracking_confidence=0.01    # 극도로 관대한 임계값
    )

    cap = cv2.VideoCapture(video_path)
    fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 720
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1280

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    frame_count = 0
    rep_results = analysis_results.get("rep_results", [])
    current_rep = 0

    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.8
    thickness = 2

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        overlay_frame = frame.copy()

        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(image)

        if results.pose_landmarks:
            mp.solutions.drawing_utils.draw_landmarks(
                overlay_frame,
                results.pose_landmarks,
                mp_pose.POSE_CONNECTIONS
            )
            for rep_info in rep_results:
                if rep_info.get("frame_start", 0) <= frame_count <= rep_info.get("frame_end", 10**9):
                    current_rep = rep_info.get("rep", 0)
                    break

        # 상단 패널
        panel_height = 120
        cv2.rectangle(overlay_frame, (0, 0), (width, panel_height), (0, 0, 0), -1)
        cv2.rectangle(overlay_frame, (0, 0), (width, panel_height), (255, 255, 255), 2)

        info_texts = [
            f"Rep: {current_rep}",
            f"Total: {analysis_results.get('total_count', 0)}",
            f"Score: {analysis_results.get('score', 0)}",
            f"Grade: {analysis_results.get('grade', 'N/A')}"
        ]

        for i, text in enumerate(info_texts):
            y_pos = 30 + i * 25
            cv2.putText(overlay_frame, text, (20, y_pos), font, font_scale, (255, 255, 255), thickness)

        # 하단 패널
        stats_panel_y = height - 80
        cv2.rectangle(overlay_frame, (0, stats_panel_y), (width, height), (0, 0, 0), -1)
        cv2.rectangle(overlay_frame, (0, stats_panel_y), (width, height), (255, 255, 255), 2)

        counts = analysis_results.get("counts", {})
        stats_texts = [
            f"Full Squat: {counts.get('Full Squat', 0)}",
            f"Basic Squat: {counts.get('Basic Squat', 0)}",
            f"Half Squat: {counts.get('Half Squat', 0)}",
            f"Fail Squat: {counts.get('Fail Squat', 0)}"
        ]

        for i, text in enumerate(stats_texts):
            y_pos = stats_panel_y + 25 + i * 15
            cv2.putText(overlay_frame, text, (20, y_pos), font, 0.6, (255, 255, 255), 1)

        if 0 < current_rep <= len(rep_results):
            rep_info = rep_results[current_rep - 1]
            rep_text = f"Rep {current_rep}: {rep_info.get('label', 'N/A')} ({rep_info.get('min_knee_angle', 0)}°)"
            cv2.putText(overlay_frame, rep_text, (width//2 - 150, height//2), font, 1.2, (0, 255, 0), 3)

        out.write(overlay_frame)
        frame_count += 1

    cap.release()
    out.release()
    print(f"✅ 오버레이 비디오 생성 완료: {output_path}")

def analyze_squat_with_overlay(video_path):
    """스쿼트 분석 및 오버레이 비디오 생성 - 속도 최적화"""
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,  # 속도 향상을 위해 1로 낮춤
        smooth_landmarks=True,
        enable_segmentation=False,
        smooth_segmentation=True,
        min_detection_confidence=0.3,  # 속도 향상을 위해 0.3으로 상향
        min_tracking_confidence=0.3    # 속도 향상을 위해 0.3으로 상향
    )

    MOVE_THRESHOLD_START = 0.0001  # 더 민감한 움직임 감지
    MOVE_THRESHOLD_END = 0.005     # 더 민감한 움직임 감지
    READY_THRESHOLD = 10           # 더 빠른 분석 시작
    POST_SQUAT_FREEZE_FRAMES = 30  # 스쿼트 간 충분한 대기 시간 (10 → 30)

    previous_hip = None
    ready_frames = 0
    counting_started = False
    post_squat_wait = 0
    counter = 0
    stage = None
    prev_stage = None
    min_knee_angle = 180
    rep_result_list = []
    counts = {"Half Squat": 0, "Basic Squat": 0, "Full Squat": 0, "Fail Squat": 0}

    frame_analysis = []
    frame_count = 0

    def calculate_angle(a, b, c):
        a, b, c = np.array(a), np.array(b), np.array(c)
        ab = a - b
        cb = c - b
        cosine = np.dot(ab, cb) / (np.linalg.norm(ab) * np.linalg.norm(cb) + 1e-6)
        return np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0)))

    def get_best_leg_angle(lm):
        """양쪽 다리 중 더 안정적인 각도 선택"""
        try:
            # 왼쪽 다리
            left_hip = [lm[mp_pose.PoseLandmark.LEFT_HIP.value].x, lm[mp_pose.PoseLandmark.LEFT_HIP.value].y]
            left_knee = [lm[mp_pose.PoseLandmark.LEFT_KNEE.value].x, lm[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
            left_ankle = [lm[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, lm[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
            left_angle = calculate_angle(left_hip, left_knee, left_ankle)
            
            # 오른쪽 다리
            right_hip = [lm[mp_pose.PoseLandmark.RIGHT_HIP.value].x, lm[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
            right_knee = [lm[mp_pose.PoseLandmark.RIGHT_KNEE.value].x, lm[mp_pose.PoseLandmark.RIGHT_KNEE.value].y]
            right_ankle = [lm[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x, lm[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]
            right_angle = calculate_angle(right_hip, right_knee, right_ankle)
            
            # 더 안정적인 각도 선택
            if left_angle > 30 and right_angle > 30:
                if abs(left_angle - right_angle) < 25:
                    return (left_angle + right_angle) / 2, left_hip
                else:
                    return max(left_angle, right_angle), left_hip if left_angle > right_angle else right_hip
            elif left_angle > 30:
                return left_angle, left_hip
            elif right_angle > 30:
                return right_angle, right_hip
            else:
                return left_angle, left_hip
        except Exception as e:
            # 기본값으로 왼쪽 다리 사용
            left_hip = [lm[mp_pose.PoseLandmark.LEFT_HIP.value].x, lm[mp_pose.PoseLandmark.LEFT_HIP.value].y]
            left_knee = [lm[mp_pose.PoseLandmark.LEFT_KNEE.value].x, lm[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
            left_ankle = [lm[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, lm[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
            return calculate_angle(left_hip, left_knee, left_ankle), left_hip

    def record_squat(rep_result_list, counter, label, min_knee_angle, frame_start, frame_end):
        rep_result_list.append({
            "rep": counter,
            "label": label,
            "min_knee_angle": int(min_knee_angle),
            "frame_start": frame_start,
            "frame_end": frame_end
        })

    cap = cv2.VideoCapture(video_path)
    rep_start_frame = 0
    
    # 동영상 정보 출력
    fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 720
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1280
    print(f"📹 분석할 동영상: {width}x{height} @ {fps}fps")
    print(f"⚡ 속도 최적화 적용: 320x240 프레임, 전처리 제거, 임계값 0.3")

    # 포즈 감지 성공/실패 통계
    pose_detected_frames = 0
    pose_failed_frames = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # 속도 최적화: 프레임 크기만 축소하고 전처리 제거
        small_frame = cv2.resize(frame, (240, 180), interpolation=cv2.INTER_AREA)  # 더 작은 크기로 감지 성능 향상
        
        # 전처리 없이 바로 포즈 감지 (속도 대폭 향상)
        image = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        results = pose.process(image)

        frame_analysis.append({
            "frame": frame_count,
            "has_pose": results.pose_landmarks is not None,
            "stage": stage,
            "knee_angle": None
        })

        if not results.pose_landmarks:
            pose_failed_frames += 1
            # 로그 빈도 줄임 (50프레임마다)
            if frame_count % 50 == 0:
                print(f"❌ 프레임 {frame_count}: 포즈 감지 실패 (누적: {pose_failed_frames})")
            frame_count += 1
            continue

        pose_detected_frames += 1

        # 로그 빈도 줄임 (50프레임마다)
        if frame_count % 50 == 0:
            print(f"✅ 프레임 {frame_count}: 포즈 감지 성공 (누적: {pose_detected_frames})")

        lm = results.pose_landmarks.landmark
        
        # 양쪽 다리 중 더 안정적인 각도 선택
        knee_angle, hip = get_best_leg_angle(lm)

        frame_analysis[-1]["knee_angle"] = knee_angle

        # 디버깅: 각도 변화 모니터링 (50프레임마다)
        if frame_count % 50 == 0:
            print(f"🔍 프레임 {frame_count}: 무릎 각도 = {knee_angle:.1f}°, 단계 = {stage}")

        move = 0 if previous_hip is None else abs(hip[0] - previous_hip[0]) + abs(hip[1] - previous_hip[1])
        previous_hip = hip

        if not counting_started:
            # 각도 변화로 스쿼트 동작 감지 시 즉시 시작
            if knee_angle < 165:  # 더 엄격한 스쿼트 시작 조건 (170 → 165)
                counting_started = True
                print(f"🚀 스쿼트 동작 감지! 각도: {knee_angle:.1f}° → 분석 시작")
            else:
                ready_frames = ready_frames + 1 if move < MOVE_THRESHOLD_START else 0
                if ready_frames >= READY_THRESHOLD:
                    counting_started = True
                    print("- 분석 시작 -")
            frame_count += 1
            continue

        if post_squat_wait > 0:
            if move < MOVE_THRESHOLD_START and knee_angle > 150:  # 더 빠른 다음 스쿼트 감지
                post_squat_wait -= 1
                frame_count += 1
                continue
            else:
                post_squat_wait = 0

        if counting_started and stage == "up" and move > MOVE_THRESHOLD_END:
            # 더 엄격한 종료 조건: 연속으로 여러 프레임에서 이동이 감지되어야 종료
            if frame_count > 100:  # 최소 100프레임은 분석
                print("✅ 마지막 스쿼트 이후 이동 감지됨 → 분석 종료")
                break
            else:
                print(f"⚠️ 너무 일찍 종료 방지: 프레임 {frame_count} (최소 100프레임 필요)")

        if stage == "down" or (stage is None and knee_angle < 170):  # 더 현실적인 하강 감지 (175 → 170)
            min_knee_angle = min(min_knee_angle, knee_angle)

        stage = "down" if knee_angle < 155 else "up"  # 더 현실적인 단계 전환 (160 → 155)

        # 디버깅: 단계 변화 모니터링
        if prev_stage != stage and stage is not None:
            print(f"🔄 단계 변화: {prev_stage} → {stage} (각도: {knee_angle:.1f}°)")

        if prev_stage == "down" and stage == "up":
            # 스쿼트 간 최소 대기 시간 확인
            if frame_count - rep_start_frame < 15:  # 최소 15프레임 이상의 동작 필요
                print(f"⚠️ 너무 빠른 스쿼트 감지 무시: {frame_count - rep_start_frame}프레임 (최소 15프레임 필요)")
                continue
                
            counter += 1
            # 요청된 결과에 맞게 판정 기준 수정
            if 100 >= min_knee_angle > 80:  # 75 → 80으로 조정
                label = "Half Squat"
            elif 80 >= min_knee_angle > 55:  # 60 → 55로 조정
                label = "Basic Squat"
            elif 55 >= min_knee_angle > 0:   # 60 → 55로 조정
                label = "Full Squat"
            else:
                label = "Fail Squat"
            print(f"🎯 {counter}회 스쿼트 감지! | 판정: {label} | 각도: {min_knee_angle:.1f}° | 프레임: {rep_start_frame}-{frame_count}")
            counts[label] += 1
            record_squat(rep_result_list, counter, label, min_knee_angle, rep_start_frame, frame_count)
            min_knee_angle = 180
            post_squat_wait = POST_SQUAT_FREEZE_FRAMES

        if stage == "down" and prev_stage != "down":
            rep_start_frame = frame_count

        prev_stage = stage
        frame_count += 1

    cap.release()

    # 분석 결과 요약
    total_frames = len(frame_analysis)
    detected_frames = sum(1 for f in frame_analysis if f["has_pose"])
    detection_rate = (detected_frames / total_frames) * 100 if total_frames > 0 else 0
    
    print(f"📊 분석 결과 요약:")
    print(f"   총 프레임: {total_frames}")
    print(f"   포즈 감지: {detected_frames} ({detection_rate:.1f}%)")
    print(f"   포즈 감지 성공: {pose_detected_frames}")
    print(f"   포즈 감지 실패: {pose_failed_frames}")
    print(f"   스쿼트 횟수: {counter}")
    print(f"   최소 각도: {min_knee_angle}°")

    # 포즈 감지율이 너무 낮으면 경고
    if detection_rate < 50:
        print(f"⚠️ 경고: 포즈 감지율이 낮습니다 ({detection_rate:.1f}%)")

    weight = {"Full Squat": 1.0, "Basic Squat": 0.7, "Half Squat": 0.4}
    raw_score = (
        counts["Full Squat"] * weight["Full Squat"] +
        counts["Basic Squat"] * weight["Basic Squat"] +
        counts["Half Squat"] * weight["Half Squat"]
    )
    max_score = (
        (counts["Full Squat"] + counts["Basic Squat"] + counts["Half Squat"]) * weight["Full Squat"]
    )
    score_ratio = raw_score / max(max_score, 1)
    base_score = score_ratio * 100
    penalty = counts["Fail Squat"] * 3
    final_score = max(0, min(100, int(base_score - penalty)))

    if final_score >= 80:
        msg = "Perfect!!"
    elif final_score >= 60:
        msg = "Great!!"
    elif final_score >= 40:
        msg = "Good!!"
    else:
        msg = "Bad.."

    result = {
        "counts": counts,
        "total_count": counter,
        "score": final_score,
        "grade": msg,
        "rep_results": rep_result_list,
        "frame_analysis": frame_analysis
    }

    output_path = video_path.replace(".mp4", "_analyzed.mp4")
    create_overlay_video(video_path, result, output_path)

    return result, output_path

# =========================
# 동영상 정규화
# =========================
def normalize_video(video_path, target_width=1920, target_height=1080, target_fps=29):
    """동영상을 표준 해상도로 정규화 - 1920x1080 @ 29fps"""
    print(f"🔄 동영상 정규화 시작: {target_width}x{target_height} @ {target_fps}fps")
    
    # 임시 정규화된 동영상 경로
    normalized_path = video_path.replace(".mp4", "_normalized.mp4")
    
    cap = cv2.VideoCapture(video_path)
    original_fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
    original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 720
    original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1280
    
    print(f"📹 원본 동영상: {original_width}x{original_height} @ {original_fps}fps")
    
    # 정규화가 필요한지 확인
    if (original_width == target_width and 
        original_height == target_height and 
        original_fps == target_fps):
        print("✅ 이미 표준 해상도 - 정규화 불필요")
        cap.release()
        return video_path
    
    # 비디오 라이터 설정
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(normalized_path, fourcc, target_fps, (target_width, target_height))
    
    frame_count = 0
    processed_frames = 0
    
    # FPS 조정을 위한 프레임 간격 계산
    frame_interval = original_fps / target_fps
    next_frame_time = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        # 현재 프레임 시간
        current_frame_time = frame_count / original_fps
        
        # FPS 조정: 목표 FPS에 맞춰 프레임 선택
        if current_frame_time >= next_frame_time:
            # 프레임 정규화
            normalized_frame = cv2.resize(frame, (target_width, target_height), interpolation=cv2.INTER_AREA)
            
            # 정규화된 프레임을 출력
            out.write(normalized_frame)
            processed_frames += 1
            
            # 다음 프레임 시간 계산
            next_frame_time = processed_frames / target_fps
        
        frame_count += 1
        
        # 진행상황 표시
        if frame_count % 100 == 0:
            print(f"   진행률: {frame_count} 프레임 읽기, {processed_frames} 프레임 처리 완료")
    
    cap.release()
    out.release()
    
    # 정규화 결과 검증
    if os.path.exists(normalized_path):
        verify_cap = cv2.VideoCapture(normalized_path)
        final_fps = int(verify_cap.get(cv2.CAP_PROP_FPS)) or 30
        final_width = int(verify_cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 720
        final_height = int(verify_cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1280
        verify_cap.release()
        
        print(f"✅ 동영상 정규화 완료: {processed_frames} 프레임 → {final_width}x{final_height} @ {final_fps}fps")
        print(f"🔍 정규화 검증: 원본 {original_width}x{original_height}@{original_fps} → 결과 {final_width}x{final_height}@{final_fps}")
        
        # 정규화가 제대로 되었는지 확인
        if final_width == target_width and final_height == target_height and final_fps == target_fps:
            print("✅ 정규화 성공!")
            return normalized_path
        else:
            print("❌ 정규화 실패 - 원본 동영상 반환")
            os.remove(normalized_path)
            return video_path
    else:
        print("❌ 정규화된 동영상 파일 생성 실패")
        return video_path

# =========================
# 메시지 처리
# =========================
def process_video_message(msg):
    """동영상 메시지 처리"""
    try:
        print(f"🔍 메시지 내용 확인:")
        print(f"   Body: {msg['Body'][:200]}...")

        body = json.loads(msg["Body"])

        # 메시지 구조
        if "Records" in body:
            object_key = unquote_plus(body["Records"][0]["s3"]["object"]["key"])
            print(f"   📁 S3 이벤트 감지: {object_key}")
        elif "video_key" in body:
            object_key = body["video_key"]
            print(f"   비디오 키: {object_key}")
        else:
            print(f"   ❌ 알 수 없는 메시지 구조: {list(body.keys())}")
            print("❌ 메시지 구조 오류 → 삭제")
            delete_message(msg["ReceiptHandle"])
            return False

        # 중복/분석본 필터
        if object_key in processed_videos or object_key.endswith("_analyzed.mp4"):
            print(f"⚠️ 분석된 영상 또는 이미 처리된 영상: {object_key} → 삭제")
            delete_message(msg["ReceiptHandle"])
            return True

        print(f"새로운 동영상 분석 시작: {object_key}")

        # 다운로드 및 파싱
        video_path = download_video(object_key)
        user_id, user_name, load_kg, timestamp = parse_filename(os.path.basename(video_path))

        if None in [user_id, user_name, load_kg, timestamp]:
            print("❌ 파일명 파싱 실패 → 삭제")
            delete_message(msg["ReceiptHandle"])
            return False

        # 동영상 정규화 (1920x1080 @ 29fps)
        normalized_video_path = normalize_video(video_path)

        # 최신 입실 조회
        visit_res = requests.get(f"{BASE_URL}/visits/last/{user_id}")
        if visit_res.status_code != 200:
            print("❌ 입실 기록 없음 → 삭제")
            delete_message(msg["ReceiptHandle"])
            return False
        visit_id = visit_res.json()["id"]

        # 운동 등록
        workout_data = {
            "user_id": user_id,
            "visit_id": visit_id,
            "exercise_id": 2,  # 스쿼트 (필요시 메시지/메타데이터로 받아서 변경)
            "load_kg": load_kg,
            "s3_key": object_key
        }
        res = requests.post(f"{BASE_URL}/workouts", json=workout_data)
        print("▶ POST /workouts:", res.status_code)
        if res.status_code != 200:
            print("❌ 운동 등록 실패:", res.text)
            delete_message(msg["ReceiptHandle"])
            return False

        workout_id   = res.json()["workout_id"]
        exercise_id  = workout_data["exercise_id"]
        exercise_dir = EXERCISE_MAP.get(exercise_id, "squat")

        # 정규화된 동영상으로 분석 실행
        result, analyzed_video_local_path = analyze_squat_with_overlay(normalized_video_path)

        yyyymmdd = ts_to_yyyymmdd(timestamp)
        set_no   = get_next_set_no(user_id, user_name, yyyymmdd, exercise_dir)

        analyzed_object_key = f"{ROOT_PREFIX}/{user_id}_{user_name}/{yyyymmdd}/{exercise_dir}/set{set_no}_{timestamp}.mp4"

        s3.upload_file(
            analyzed_video_local_path,
            bucket_name,
            analyzed_object_key,
            ExtraArgs={
                "ContentType": "video/mp4",
                "Metadata": {
                    "user-id": str(user_id),
                    "exercise": exercise_dir,
                    "set-no": str(set_no),
                    "timestamp": timestamp
                }
            }
        )
        print(f"✅ 분석된 비디오 업로드 완료: {analyzed_object_key}")


        # 분석 결과 저장 (서버)
        analysis_data = {
            "rep_cnt": result["total_count"],
            "feedback": {
                "depth": result["grade"],
                "alignment": "auto",
                "score": result["score"],
                "counts": result["counts"]
            },
            "rep_results": result["rep_results"],
            "analyzed_video_key": analyzed_object_key
        }

        res2 = requests.patch(
            f"{BASE_URL}/workouts/{workout_id}/analysis",
            params={"user_id": user_id},
            json=analysis_data
        )
        print("▶ PATCH /analysis:", res2.status_code)
        if res2.status_code == 200:
            print("✅ 분석 결과 저장 성공:", res2.json())
        else:
            print("❌ 분석 결과 저장 실패:", res2.text)

        # 로컬 파일 정리
        try:
            os.remove(video_path)
            if normalized_video_path != video_path:  # 정규화된 동영상이 다른 파일인 경우
                os.remove(normalized_video_path)
            os.remove(analyzed_video_local_path)
            print(f"🧹 로컬 파일 삭제: {video_path}, {normalized_video_path}, {analyzed_video_local_path}")
        except Exception as e:
            print(f"로컬 파일 삭제 실패: {e}")

        processed_videos.add(object_key)
        print(f"✅ 동영상 분석 완료: {object_key}")

        delete_message(msg["ReceiptHandle"])
        return True

    except Exception as e:
        print("❌ 예외 발생:", e)
        print("💬 원본 메시지:\n", msg.get("Body"))

        try:
            if 'video_path' in locals() and os.path.exists(video_path):
                os.remove(video_path)
            if 'normalized_video_path' in locals() and os.path.exists(normalized_video_path) and normalized_video_path != video_path:
                os.remove(normalized_video_path)
            if 'analyzed_video_local_path' in locals() and os.path.exists(analyzed_video_local_path):
                os.remove(analyzed_video_local_path)
            print(f"예외 발생 후 로컬 파일 삭제")
        except Exception:
            pass

        delete_message(msg["ReceiptHandle"])
        return False

print("스쿼트 분석 시작...")
print("⏳ 동영상 대기 중... (동영상을 업로드하면 분석이 시작됩니다)")

# 큐 상태 확인
try:
    response = sqs.get_queue_attributes(
        QueueUrl=queue_url,
        AttributeNames=['ApproximateNumberOfMessages']
    )
    message_count = int(response['Attributes']['ApproximateNumberOfMessages'])
    print(f"현재 큐에 {message_count}개의 메시지가 있습니다")
except Exception as e:
    print(f"큐 상태 확인 실패: {e}")

while True:
    msg = get_message()
    if msg:
        print("\n📥 동영상 메시지 감지됨!")
        success = process_video_message(msg)

        if success:
            print("✅ 동영상 분석 완료")
        else:
            print("❌ 동영상 분석 실패")
    else:
        print("🕓 동영상 없음, 대기 중...")

    time.sleep(5)
