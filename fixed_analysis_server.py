import os, time, json, math
import numpy as np
import cv2
import boto3
import mediapipe as mp
import requests
from urllib.parse import unquote_plus

# AWS 설정
queue_url = "https://sqs.ap-northeast-2.amazonaws.com/302263062071/fitvideo_analysis"
bucket_name = "thefit-bucket"
sqs = boto3.client("sqs", region_name="ap-northeast-2")
s3 = boto3.client("s3", region_name="ap-northeast-2")

# 서버 주소
BASE_URL = "http://13.209.67.129:8000"

# 처리된 동영상 추적
processed_videos = set()

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
    name = filename.replace(".mp4", "")
    parts = name.split("_")
    if len(parts) >= 4:
        try:
            uid = int(parts[0])
            uname = parts[1]
            load_kg = float(parts[2])
            timestamp = parts[3]
            return uid, uname, load_kg, timestamp
        except:
            return None, None, None, None
    return None, None, None, None

def create_overlay_video(video_path, analysis_results, output_path):
    """분석 결과를 오버레이로 표시한 동영상 생성"""
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose()
    
    cap = cv2.VideoCapture(video_path)
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # 비디오 작성자 설정
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    
    frame_count = 0
    rep_results = analysis_results.get("rep_results", [])
    current_rep = 0
    
    # 폰트 설정
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.8
    thickness = 2
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        # 원본 프레임 복사
        overlay_frame = frame.copy()
        
        # MediaPipe 포즈 분석
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(image)
        
        if results.pose_landmarks:
            # 포즈 랜드마크 그리기
            mp.solutions.drawing_utils.draw_landmarks(
                overlay_frame, 
                results.pose_landmarks, 
                mp_pose.POSE_CONNECTIONS
            )
            
            # 현재 프레임에 해당하는 분석 결과 찾기
            for rep_info in rep_results:
                if frame_count >= rep_info.get("frame_start", 0) and frame_count <= rep_info.get("frame_end", float('inf')):
                    current_rep = rep_info.get("rep", 0)
                    break
        
        # 상단 정보 패널 그리기
        panel_height = 120
        cv2.rectangle(overlay_frame, (0, 0), (width, panel_height), (0, 0, 0), -1)
        cv2.rectangle(overlay_frame, (0, 0), (width, panel_height), (255, 255, 255), 2)
        
        # 분석 정보 텍스트
        info_texts = [
            f"Rep: {current_rep}",
            f"Total: {analysis_results.get('total_count', 0)}",
            f"Score: {analysis_results.get('score', 0)}",
            f"Grade: {analysis_results.get('grade', 'N/A')}"
        ]
        
        for i, text in enumerate(info_texts):
            y_pos = 30 + i * 25
            cv2.putText(overlay_frame, text, (20, y_pos), font, font_scale, (255, 255, 255), thickness)
        
        # 하단 통계 패널
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
        
        # 현재 리프 정보 표시
        if current_rep > 0 and current_rep <= len(rep_results):
            rep_info = rep_results[current_rep - 1]
            rep_text = f"Rep {current_rep}: {rep_info.get('label', 'N/A')} ({rep_info.get('min_knee_angle', 0)}°)"
            cv2.putText(overlay_frame, rep_text, (width//2 - 150, height//2), font, 1.2, (0, 255, 0), 3)
        
        out.write(overlay_frame)
        frame_count += 1
    
    cap.release()
    out.release()
    print(f"✅ 오버레이 비디오 생성 완료: {output_path}")

def analyze_squat_with_overlay(video_path):
    """스쿼트 분석 및 오버레이 비디오 생성"""
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose()

    MOVE_THRESHOLD_START = 0.005
    MOVE_THRESHOLD_END = 0.02
    READY_THRESHOLD = 10
    POST_SQUAT_FREEZE_FRAMES = 10

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
    
    # 프레임별 분석 결과 저장
    frame_analysis = []
    frame_count = 0

    def calculate_angle(a, b, c):
        a, b, c = np.array(a), np.array(b), np.array(c)
        ab = a - b
        cb = c - b
        cosine = np.dot(ab, cb) / (np.linalg.norm(ab) * np.linalg.norm(cb) + 1e-6)
        return np.degrees(np.arccos(np.clip(cosine, -1.0, 1.0)))

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

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(image)
        
        frame_analysis.append({
            "frame": frame_count,
            "has_pose": results.pose_landmarks is not None,
            "stage": stage,
            "knee_angle": None
        })
        
        if not results.pose_landmarks:
            frame_count += 1
            continue

        lm = results.pose_landmarks.landmark
        hip = [lm[mp_pose.PoseLandmark.LEFT_HIP.value].x, lm[mp_pose.PoseLandmark.LEFT_HIP.value].y]
        knee = [lm[mp_pose.PoseLandmark.LEFT_KNEE.value].x, lm[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
        ankle = [lm[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, lm[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
        knee_angle = int(calculate_angle(hip, knee, ankle))
        
        frame_analysis[-1]["knee_angle"] = knee_angle
        
        move = 0 if previous_hip is None else abs(hip[0] - previous_hip[0]) + abs(hip[1] - previous_hip[1])
        previous_hip = hip

        if not counting_started:
            ready_frames = ready_frames + 1 if move < MOVE_THRESHOLD_START else 0
            if ready_frames >= READY_THRESHOLD:
                counting_started = True
                print("- 분석 시작 -")
            frame_count += 1
            continue

        if post_squat_wait > 0:
            if move < MOVE_THRESHOLD_START and knee_angle > 160:
                post_squat_wait -= 1
                frame_count += 1
                continue
            else:
                post_squat_wait = 0

        if counting_started and stage == "up" and move > MOVE_THRESHOLD_END:
            print("✅ 마지막 스쿼트 이후 이동 감지됨 → 분석 종료")
            break

        if stage == "down" or (stage is None and knee_angle < 170):
            min_knee_angle = min(min_knee_angle, knee_angle)

        stage = "down" if knee_angle < 150 else "up"

        if prev_stage == "down" and stage == "up":
            counter += 1
            if 100 >= min_knee_angle > 75:
                label = "Half Squat"
            elif 75 >= min_knee_angle > 60:
                label = "Basic Squat"
            elif 60 >= min_knee_angle >= 0:
                label = "Full Squat"
            else:
                label = "Fail Squat"
            print(f"▶ {counter}회 | 판정: {label} | 각도: {min_knee_angle}")
            counts[label] += 1
            record_squat(rep_result_list, counter, label, min_knee_angle, rep_start_frame, frame_count)
            min_knee_angle = 180
            post_squat_wait = POST_SQUAT_FREEZE_FRAMES

        if stage == "down" and prev_stage != "down":
            rep_start_frame = frame_count

        prev_stage = stage
        frame_count += 1

    cap.release()

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
    
    # 오버레이 비디오 생성
    output_path = video_path.replace(".mp4", "_analyzed.mp4")
    create_overlay_video(video_path, result, output_path)
    
    return result, output_path

def process_video_message(msg):
    """동영상 메시지 처리"""
    try:
        print(f"🔍 메시지 내용 확인:")
        print(f"   Body: {msg['Body'][:200]}...")  # 처음 200자만 출력
        
        body = json.loads(msg["Body"])
        
        # 메시지 구조 분석
        if "Records" in body:
            object_key = unquote_plus(body["Records"][0]["s3"]["object"]["key"])
            print(f"   📁 S3 이벤트 감지: {object_key}")
        elif "video_key" in body:
            object_key = body["video_key"]
            print(f"   🎬 직접 비디오 키: {object_key}")
        else:
            print(f"   ❌ 알 수 없는 메시지 구조: {list(body.keys())}")
            print("❌ 메시지 구조 오류 → 삭제")
            delete_message(msg["ReceiptHandle"])
            return False

        # 이미 처리된 동영상인지 확인
        if object_key in processed_videos:
            print(f"🔄 이미 처리된 동영상: {object_key} → 삭제")
            delete_message(msg["ReceiptHandle"])
            return True

        print(f"🎬 새로운 동영상 분석 시작: {object_key}")
        
        video_path = download_video(object_key)
        user_id, user_name, load_kg, timestamp = parse_filename(os.path.basename(video_path))

        if None in [user_id, user_name, load_kg, timestamp]:
            print("❌ 파일명 파싱 실패")
            delete_message(msg["ReceiptHandle"])
            return False

        # ✅ 최신 입실 정보 조회
        visit_res = requests.get(f"{BASE_URL}/visits/last/{user_id}")
        if visit_res.status_code != 200:
            print("❌ 최근 입실 기록 없음 → 삭제")
            delete_message(msg["ReceiptHandle"])
            return False

        visit_id = visit_res.json()["id"]

        # 운동 등록 요청
        workout_data = {
            "user_id": user_id,
            "visit_id": visit_id,
            "exercise_id": 2,  # 스쿼트
            "load_kg": load_kg,
            "s3_key": object_key
        }
        res = requests.post(f"{BASE_URL}/workouts", json=workout_data)
        print("▶ POST /workouts:", res.status_code)

        if res.status_code != 200:
            print("❌ 운동 등록 실패:", res.text)
            delete_message(msg["ReceiptHandle"])
            return False

        workout_id = res.json()["workout_id"]
        
        # ✅ 오버레이 비디오와 함께 분석
        result, analyzed_video_path = analyze_squat_with_overlay(video_path)

        # ✅ 분석된 비디오를 S3에 업로드
        analyzed_object_key = object_key.replace(".mp4", "_analyzed.mp4")
        s3.upload_file(analyzed_video_path, bucket_name, analyzed_object_key)
        print(f"✅ 분석된 비디오 업로드 완료: {analyzed_object_key}")

        # ✅ 수정된 분석 데이터 구조
        analysis_data = {
            "rep_cnt": result["total_count"],
            "feedback": {
                "depth": result["grade"],
                "alignment": "auto",
                "score": result["score"],
                "counts": result["counts"]
            },
            "rep_results": result["rep_results"],
            "analyzed_video_key": analyzed_object_key  # 분석된 비디오 키 추가
        }
        
        # ✅ 수정된 API 호출
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

        # ✅ 로컬 파일 정리
        try:
            os.remove(video_path)
            os.remove(analyzed_video_path)
            print(f"🗑️ 로컬 파일 삭제: {video_path}, {analyzed_video_path}")
        except:
            print(f"⚠️ 로컬 파일 삭제 실패")

        # ✅ 처리된 동영상으로 표시
        processed_videos.add(object_key)
        print(f"✅ 동영상 분석 완료: {object_key}")
        
        delete_message(msg["ReceiptHandle"])
        return True
        
    except Exception as e:
        print("❌ 예외 발생:", e)
        print("💬 원본 메시지:\n", msg["Body"])

        # ✅ 예외 발생 시에도 로컬 파일 정리
        try:
            if 'video_path' in locals():
                os.remove(video_path)
            if 'analyzed_video_path' in locals():
                os.remove(analyzed_video_path)
            print(f"🗑️ 예외 발생 후 로컬 파일 삭제")
        except:
            pass

        delete_message(msg["ReceiptHandle"])
        return False

# 메인 루프
print("🚀 스쿼트 분석 서버 시작...")
print("⏳ 동영상 대기 중... (동영상을 업로드하면 분석이 시작됩니다)")

# 큐 상태 확인
try:
    response = sqs.get_queue_attributes(
        QueueUrl=queue_url,
        AttributeNames=['ApproximateNumberOfMessages']
    )
    message_count = int(response['Attributes']['ApproximateNumberOfMessages'])
    print(f"📊 현재 큐에 {message_count}개의 메시지가 있습니다")
except Exception as e:
    print(f"⚠️ 큐 상태 확인 실패: {e}")

while True:
    msg = get_message()
    if msg:
        print("\n📨 동영상 메시지 감지됨!")
        success = process_video_message(msg)
        
        if success:
            print("✅ 동영상 분석 완료")
            print("⏳ 다음 동영상 대기 중...")
        else:
            print("❌ 동영상 분석 실패")
            print("⏳ 다음 동영상 대기 중...")
    else:
        print("🕓 동영상 없음, 대기 중...")
    
    time.sleep(5) 