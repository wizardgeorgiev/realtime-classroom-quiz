import React, { useEffect, useState } from "react";
import { ref, onValue, update, set } from "firebase/database";
import { db } from "../firebase";
import { QRCodeSVG } from "qrcode.react";
import { Card, Button, Badge, Tag, Space, Typography, Layout, Row, Col, Progress, Alert } from "antd";
import { DEFAULT_QUIZ } from "../data/defaultQuiz";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function TeacherScreen({ roomId }) {
    const [roomState, setRoomState] = useState(null);

    // 1. First Hook: Firebase connection listener
    useEffect(() => {
        const roomRef = ref(db, `rooms/${roomId}`);
        const unsubscribe = onValue(roomRef, (snapshot) => {
            if (!snapshot.exists()) {
                const initialData = {
                    quiz: DEFAULT_QUIZ,
                    currentQuestionIndex: 0,
                    isRevealed: false,
                    students: {},
                    answers: []
                };
                set(roomRef, initialData);
            } else {
                setRoomState(snapshot.val());
            }
        });

        const initialData = {
            quiz: DEFAULT_QUIZ,
            currentQuestionIndex: 0,
            isRevealed: false,
            students: {},
            answers: []
        };
        set(roomRef, initialData);

        return () => unsubscribe();
    }, [roomId]);

    // Safely extract properties to avoid undefined errors before data loads
    console.log(roomState); // Debugging: Log the room state to verify data structure
    const quiz = roomState?.quiz;
    const currentQuestionIndex = roomState?.currentQuestionIndex ?? 0;
    const isRevealed = roomState?.isRevealed ?? false;
    const students = roomState?.students || {};
    const answers = roomState?.answers || {};

    const connectedStudentList = Object.entries(students);
    const totalStudents = connectedStudentList.length;

    const currentQuestion = quiz ? quiz.questions[currentQuestionIndex] : null;
    const currentQuestionAnswers = answers[currentQuestionIndex] || {};
    const answeredCount = Object.keys(currentQuestionAnswers).length;

    const revealAnswers = () => {
        update(ref(db, `rooms/${roomId}`), { isRevealed: true });
    };

    // 2. Second Hook: Auto-reveal logic (Declared unconditionally at the top level)
    useEffect(() => {
        if (totalStudents > 0 && answeredCount >= totalStudents && !isRevealed) {
            revealAnswers();
        }
    }, [answeredCount, totalStudents, isRevealed]);

    // Conditional loading screen AFTER all hooks have been declared
    if (!roomState || !quiz || !currentQuestion) {
        return <div style={{ padding: 40, textAlign: "center" }}>Initializing Room...</div>;
    }

    const nextQuestion = () => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            update(ref(db, `rooms/${roomId}`), {
                currentQuestionIndex: currentQuestionIndex + 1,
                isRevealed: false
            });
        }
    };

    const prevQuestion = () => {
        if (currentQuestionIndex > 0) {
            update(ref(db, `rooms/${roomId}`), {
                currentQuestionIndex: currentQuestionIndex - 1,
                isRevealed: false
            });
        }
    };

    const joinUrl = `${window.location.origin}?room=${roomId}`;

    return (
        <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
            <Header style={{ background: "#001529", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Title level={3} style={{ color: "white", margin: 0 }}>Classroom Quiz Presentation</Title>
                <Space>
                    <Text style={{ color: "white" }}>Room ID: <strong>{roomId}</strong></Text>
                    <Badge count={totalStudents} overflowCount={99}>
                        <Tag color="green" style={{ fontSize: 14, padding: "4px 10px" }}>
                            {totalStudents} Student{totalStudents !== 1 ? "s" : ""} Connected
                        </Tag>
                    </Badge>
                </Space>
            </Header>

            <Content style={{ padding: 24, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
                <Row gutter={[24, 24]}>
                    {/* Main Question Panel */}
                    <Col xs={24} md={16}>
                        <Card style={{ marginBottom: 16 }}>
                            <Space direction="vertical" style={{ width: "100%" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <Tag color="blue">Question {currentQuestionIndex + 1} of {quiz.questions.length}</Tag>
                                    <Text type="secondary">
                                        Submissions: <strong>{answeredCount} / {totalStudents}</strong>
                                    </Text>
                                </div>
                                <Progress percent={totalStudents > 0 ? Math.round((answeredCount / totalStudents) * 100) : 0} status="active" />

                                <Title level={2} style={{ marginTop: 16 }}>{currentQuestion.question}</Title>
                            </Space>
                        </Card>

                        {/* Answer Options */}
                        {currentQuestion.options.map((opt, index) => {
                            const optionVotes = Object.values(currentQuestionAnswers).filter(a => a.selectedOptionId === opt.id).length;
                            const votePercentage = totalStudents > 0 ? Math.round((optionVotes / totalStudents) * 100) : 0;

                            let cardStyle = { marginBottom: 12, borderRadius: 8 };
                            if (isRevealed) {
                                if (opt.isCorrect) {
                                    cardStyle.border = "2px solid #52c41a";
                                    cardStyle.backgroundColor = "#f6ffed";
                                } else if (optionVotes > 0) {
                                    cardStyle.border = "2px solid #ff4d4f";
                                    cardStyle.backgroundColor = "#fff2f0";
                                }
                            }

                            return (
                                <Card key={opt.id} style={cardStyle} bodyStyle={{ padding: 16 }}>
                                    <Row align="middle" justify="space-between">
                                        <Col span={18}>
                                            <Space>
                                                <strong style={{ fontSize: 18 }}>{String.fromCharCode(65 + index)}.</strong>
                                                <Text style={{ fontSize: 18 }}>{opt.text}</Text>
                                                {isRevealed && opt.isCorrect && <Tag color="success">Correct Answer</Tag>}
                                            </Space>
                                        </Col>
                                        <Col span={6} style={{ textAlign: "right" }}>
                                            {isRevealed && <Text type="secondary">{optionVotes} votes ({votePercentage}%)</Text>}
                                        </Col>
                                    </Row>

                                    {/* Wrong Answer Explanation */}
                                    {isRevealed && !opt.isCorrect && opt.explanation && (
                                        <Alert
                                            type="warning"
                                            showIcon
                                            message="Why it's incorrect:"
                                            description={opt.explanation}
                                            style={{ marginTop: 12 }}
                                        />
                                    )}
                                </Card>
                            );
                        })}

                        {/* Control Bar */}
                        <Card style={{ marginTop: 24 }}>
                            <Row justify="space-between" align="middle">
                                <Col>
                                    <Button disabled={currentQuestionIndex === 0} onClick={prevQuestion}>
                                        Previous
                                    </Button>
                                    <Button
                                        disabled={currentQuestionIndex === quiz.questions.length - 1}
                                        onClick={nextQuestion}
                                        style={{ marginLeft: 8 }}
                                    >
                                        Next Question
                                    </Button>
                                </Col>
                                <Col>
                                    {!isRevealed ? (
                                        <Button type="primary" danger onClick={revealAnswers}>
                                            Reveal Answers
                                        </Button>
                                    ) : (
                                        <Tag color="gold" style={{ fontSize: 14, padding: "6px 12px" }}>Answers Revealed</Tag>
                                    )}
                                </Col>
                            </Row>
                        </Card>
                    </Col>

                    {/* QR Code & Connected Roster Side Panel */}
                    <Col xs={24} md={8}>
                        <Card title="Student QR Join Code" style={{ textAlign: "center", marginBottom: 16 }}>
                            <div style={{ background: "#fff", padding: 16, display: "inline-block", borderRadius: 8 }}>
                                <QRCodeSVG value={joinUrl} size={180} />
                            </div>
                            <div style={{ marginTop: 12 }}>
                                <Text type="secondary">Scan with mobile camera or visit:</Text>
                                <br />
                                <Text copyable style={{ fontSize: 12 }}>{joinUrl}</Text>
                            </div>
                        </Card>

                        <Card title={`Active Students (${totalStudents})`}>
                            {connectedStudentList.length === 0 ? (
                                <Text type="secondary">Waiting for students to join...</Text>
                            ) : (
                                <Space direction="vertical" style={{ width: "100%" }}>
                                    {connectedStudentList.map(([id, info]) => {
                                        const hasAnswered = !!currentQuestionAnswers[id];
                                        return (
                                            <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <Text>{info.name || "Anonymous Student"}</Text>
                                                {hasAnswered ? <Tag color="green">Answered</Tag> : <Tag color="default">Thinking...</Tag>}
                                            </div>
                                        );
                                    })}
                                </Space>
                            )}
                        </Card>
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
}