import React, { useEffect, useState } from "react";
import { ref, onValue, set, update, onDisconnect } from "firebase/database";
import { db } from "../firebase";
import { Button, Card, Radio, Space, NoticeBar, Toast, Tag } from "antd-mobile";
import { CheckCircleOutline, CloseCircleOutline } from "antd-mobile-icons";

export default function StudentScreen({ roomId }) {
    const [studentId] = useState(() => "student_" + Math.random().toString(36).substr(2, 9));
    const [studentName, setStudentName] = useState("");
    const [joined, setJoined] = useState(false);
    const [roomState, setRoomState] = useState(null);
    const [selectedOptionId, setSelectedOptionId] = useState(null);

    const handleJoin = (e) => {
        e.preventDefault();
        if (!studentName.trim()) {
            Toast.show({ content: "Please enter your name", icon: "fail" });
            return;
        }
        const studentRef = ref(db, `rooms/${roomId}/students/${studentId}`);
        set(studentRef, { name: studentName });
        onDisconnect(studentRef).remove();
        setJoined(true);
    };

    useEffect(() => {
        if (!joined) return;
        const roomRef = ref(db, `rooms/${roomId}`);
        const unsubscribe = onValue(roomRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setRoomState(data);

                const currentQIdx = data.currentQuestionIndex;
                const myAnswer = data.answers?.[currentQIdx]?.[studentId];
                if (myAnswer) {
                    setSelectedOptionId(myAnswer.selectedOptionId);
                } else {
                    setSelectedOptionId(null);
                }
            }
        });

        return () => unsubscribe();
    }, [joined, roomId, studentId]);

    const submitAnswer = (optionId) => {
        if (roomState?.isRevealed) return;
        setSelectedOptionId(optionId);
        const answerRef = ref(db, `rooms/${roomId}/answers/${roomState.currentQuestionIndex}/${studentId}`);
        set(answerRef, { selectedOptionId: optionId, timestamp: Date.now() });
    };

    if (!joined) {
        return (
            <div style={{ padding: 20, maxWidth: 400, margin: "40px auto" }}>
                <Card title="Join Classroom Session">
                    <form onSubmit={handleJoin}>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: "block", marginBottom: 8 }}>Your Name:</label>
                            <input
                                type="text"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                placeholder="Enter your name"
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: "6px",
                                    border: "1px solid #ccc",
                                    fontSize: "16px"
                                }}
                            />
                        </div>
                        <Button block type="submit" color="primary" size="large">
                            Join Quiz
                        </Button>
                    </form>
                </Card>
            </div>
        );
    }

    if (!roomState || !roomState.quiz) {
        return <div style={{ padding: 20, textAlign: "center" }}>Loading question...</div>;
    }

    const { quiz, currentQuestionIndex, isRevealed } = roomState;
    const currentQuestion = quiz.questions[currentQuestionIndex];

    return (
        <div style={{ padding: 16, maxWidth: 500, margin: "0 auto", paddingBottom: 40 }}>
            <NoticeBar
                content={`Connected as ${studentName} | Question ${currentQuestionIndex + 1} of ${quiz.questions.length}`}
                color="info"
            />

            <Card style={{ marginTop: 16 }}>
                <h2>{currentQuestion.question}</h2>
            </Card>

            <div style={{ marginTop: 16 }}>
                <Space direction="vertical" block style={{ "--gap": "12px" }}>
                    {currentQuestion.options.map((opt) => {
                        const isSelected = selectedOptionId === opt.id;

                        let cardStyle = {
                            padding: "16px",
                            borderRadius: "8px",
                            border: "1px solid #e5e5e5",
                            background: "#fff",
                            cursor: isRevealed ? "default" : "pointer"
                        };

                        if (isSelected) {
                            cardStyle.border = "2px solid #1677ff";
                            cardStyle.background = "#e6f4ff";
                        }

                        if (isRevealed) {
                            if (opt.isCorrect) {
                                cardStyle.border = "2px solid #52c41a";
                                cardStyle.background = "#f6ffed";
                            } else if (isSelected && !opt.isCorrect) {
                                cardStyle.border = "2px solid #ff4d4f";
                                cardStyle.background = "#fff2f0";
                            }
                        }

                        return (
                            <div
                                key={opt.id}
                                style={cardStyle}
                                onClick={() => !isRevealed && submitAnswer(opt.id)}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "16px", fontWeight: isSelected ? "bold" : "normal" }}>
                                        {opt.text}
                                    </span>
                                    {isRevealed && (
                                        <span>
                                            {opt.isCorrect && <Tag color="success"><CheckCircleOutline /> Correct</Tag>}
                                            {isSelected && !opt.isCorrect && <Tag color="danger"><CloseCircleOutline /> Your Answer</Tag>}
                                        </span>
                                    )}
                                </div>

                                {isRevealed && !opt.isCorrect && opt.explanation && (
                                    <div
                                        style={{
                                            marginTop: 10,
                                            padding: "8px 12px",
                                            background: "#fffbe6",
                                            border: "1px solid #ffe58f",
                                            borderRadius: "6px",
                                            fontSize: "13px",
                                            color: "#d48806"
                                        }}
                                    >
                                        <strong>Why wrong:</strong> {opt.explanation}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </Space>
            </div>

            <div style={{ marginTop: 24, textAlign: "center" }}>
                {isRevealed ? (
                    <Tag color="warning" fill="outline" style={{ padding: "8px 16px", fontSize: "14px" }}>
                        Waiting for next question...
                    </Tag>
                ) : selectedOptionId ? (
                    <Tag color="primary" fill="outline" style={{ padding: "8px 16px", fontSize: "14px" }}>
                        Answer submitted! You can change it until answers are revealed.
                    </Tag>
                ) : (
                    <Tag color="default" fill="outline" style={{ padding: "8px 16px", fontSize: "14px" }}>
                        Select an answer above
                    </Tag>
                )}
            </div>
        </div>
    );
}
