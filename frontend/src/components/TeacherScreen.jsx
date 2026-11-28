import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
    Card,
    Button,
    Tag,
    Space,
    Typography,
    Layout,
    Row,
    Col,
    Progress,
    Alert
} from "antd";
import { socket } from "../socket";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

function LivePulseIcon() {
    return (
        <span
            aria-hidden="true"
            style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 14,
                height: 14,
                flexShrink: 0
            }}
        >
            <span className="teacher-live-pulse-ring" />
            <span
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "#52c41a",
                    position: "relative",
                    zIndex: 1
                }}
            />
        </span>
    );
}

export default function TeacherScreen({ roomId: initialRoomId, selections = [] }) {
    const navigate = useNavigate();
    const [activeRoomId, setActiveRoomId] = useState(initialRoomId || null);
    const [quizMeta, setQuizMeta] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isRevealed, setIsRevealed] = useState(false);
    const [studentCount, setStudentCount] = useState(0);
    const [answeredCount, setAnsweredCount] = useState(0);
    const [optionCounts, setOptionCounts] = useState({});
    const [errorMessage, setErrorMessage] = useState(null);
    const [endingSession, setEndingSession] = useState(false);
    const isClosingRef = useRef(false);

    const applyTeacherFullState = useCallback((state) => {
        if (!state) return;
        setQuizMeta({
            title: state.title,
            subject: state.subject,
            questions: state.questions || []
        });
        setCurrentQuestionIndex(state.currentQuestionIndex ?? 0);
        setIsRevealed(Boolean(state.isRevealed));
        setStudentCount(state.studentCount ?? 0);
        setAnsweredCount(state.answeredCount ?? 0);
        setOptionCounts(state.optionCounts || {});
    }, []);

    const syncQuestionToRoom = useCallback(
        (qIndex, revealFlag) => {
            if (!activeRoomId || !quizMeta?.questions?.[qIndex]) return;

            socket.emit("teacher:syncQuestion", {
                roomId: activeRoomId,
                questionIndex: qIndex,
                isRevealed: revealFlag
            });
        },
        [activeRoomId, quizMeta]
    );

    useEffect(() => {
        isClosingRef.current = false;

        const initRoom = () => {
            if (isClosingRef.current) return;
            socket.emit(
                "teacher:initRoom",
                {
                    roomId: initialRoomId || undefined,
                    selections
                },
                (res) => {
                    if (isClosingRef.current) return;
                    if (res && res.ok && res.state) {
                        const createdId = res.roomId || res.state.roomId;
                        setActiveRoomId(createdId);
                        applyTeacherFullState(res.state);
                        setErrorMessage(null);

                        if (!initialRoomId && createdId) {
                            navigate(`/teacher/${createdId}`, {
                                replace: true,
                                state: { selections }
                            });
                        }
                    } else {
                        setErrorMessage(res?.error || "Failed to initialize quiz room.");
                    }
                }
            );
        };

        if (socket.connected) {
            initRoom();
        }

        const handleTeacherState = (data) => {
            if (isClosingRef.current || !data) return;
            if (data.roomId) setActiveRoomId(data.roomId);
            applyTeacherFullState(data);
        };

        const handleQuestionSync = (delta) => {
            if (isClosingRef.current || !delta) return;
            setCurrentQuestionIndex(delta.currentQuestionIndex ?? 0);
            setIsRevealed(Boolean(delta.isRevealed));
            if (typeof delta.answeredCount === "number") {
                setAnsweredCount(delta.answeredCount);
            }
            if (delta.optionCounts) {
                setOptionCounts(delta.optionCounts);
            }
        };

        const handleAnswerUpdate = ({
            answeredCount: nextAnsweredCount,
            optionCounts: nextOptionCounts
        }) => {
            if (isClosingRef.current) return;
            if (typeof nextAnsweredCount === "number") {
                setAnsweredCount(nextAnsweredCount);
            }
            if (nextOptionCounts) {
                setOptionCounts(nextOptionCounts);
            }
        };

        const handleRosterUpdate = ({ studentCount: nextStudentCount }) => {
            if (isClosingRef.current) return;
            if (typeof nextStudentCount === "number") {
                setStudentCount(nextStudentCount);
            }
        };

        socket.on("connect", initRoom);
        socket.on("teacher:state", handleTeacherState);
        socket.on("teacher:questionSync", handleQuestionSync);
        socket.on("teacher:answerUpdate", handleAnswerUpdate);
        socket.on("teacher:roster", handleRosterUpdate);

        return () => {
            socket.off("connect", initRoom);
            socket.off("teacher:state", handleTeacherState);
            socket.off("teacher:questionSync", handleQuestionSync);
            socket.off("teacher:answerUpdate", handleAnswerUpdate);
            socket.off("teacher:roster", handleRosterUpdate);
        };
    }, [initialRoomId, selections, navigate, applyTeacherFullState]);

    const currentQuestion = quizMeta?.questions?.[currentQuestionIndex] || null;

    const revealAnswers = useCallback(() => {
        if (!currentQuestion) return;
        syncQuestionToRoom(currentQuestionIndex, true);
    }, [currentQuestion, syncQuestionToRoom, currentQuestionIndex]);

    useEffect(() => {
        if (studentCount > 0 && answeredCount >= studentCount && !isRevealed) {
            revealAnswers();
        }
    }, [answeredCount, studentCount, isRevealed, revealAnswers]);

    const handleEndSession = () => {
        if (endingSession || isClosingRef.current) return;
        isClosingRef.current = true;
        setEndingSession(true);

        if (activeRoomId) {
            socket.emit("teacher:endSession", { roomId: activeRoomId }, () => {
                navigate("/");
            });
        } else {
            navigate("/");
        }
    };

    if (errorMessage) {
        return (
            <div style={{ padding: 40, maxWidth: 600, margin: "0 auto" }}>
                <Alert
                    type="error"
                    showIcon
                    message="Unable to Start Room"
                    description={errorMessage}
                    action={
                        <Button onClick={() => navigate("/")}>Back to Quiz Builder</Button>
                    }
                />
            </div>
        );
    }

    if (!quizMeta || !currentQuestion || !activeRoomId) {
        return (
            <div style={{ padding: 40, textAlign: "center" }}>
                Generating room &amp; questions on server...
            </div>
        );
    }

    const nextQuestion = () => {
        if (currentQuestionIndex < quizMeta.questions.length - 1) {
            syncQuestionToRoom(currentQuestionIndex + 1, false);
        }
    };

    const joinUrl = `${window.location.origin}/student?room=${activeRoomId}`;

    return (
        <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
            <style>{`
        @keyframes teacherLiveRadarPulse {
          0% {
            transform: scale(0.75);
            opacity: 0.85;
          }
          70% {
            transform: scale(2.1);
            opacity: 0;
          }
          100% {
            transform: scale(2.1);
            opacity: 0;
          }
        }

        .teacher-live-pulse-ring {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #52c41a;
          animation: teacherLiveRadarPulse 1.8s cubic-bezier(0.24, 0, 0.38, 1) infinite;
        }

        .topic-question-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .topic-question-tags {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 8px;
        }

        @media (max-width: 576px) {
          .topic-question-bar {
            align-items: flex-start;
          }

          .topic-question-tags {
            flex-direction: column;
            align-items: flex-start;
          }

          .topic-question-tags .adm-tag {
            white-space: normal;
            height: auto;
          }
        }
      `}</style>

            <Header
                style={{
                    background: "#001529",
                    padding: "0 24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}
            >
                <Space align="center" size={10}>
                    <LivePulseIcon />
                    <Title level={3} style={{ color: "white", margin: 0, lineHeight: 1 }}>
                        Quiz
                    </Title>
                </Space>
                <Space align="center">
                    <Tag
                        color="green"
                        style={{
                            fontSize: 14,
                            padding: "4px 10px"
                        }}
                    >
                        {studentCount} Student{studentCount !== 1 ? "s" : ""} Connected
                    </Tag>
                    <Button
                        danger
                        type="primary"
                        loading={endingSession}
                        onClick={handleEndSession}
                    >
                        End Session
                    </Button>
                </Space>
            </Header>

            <Content style={{ padding: 24, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
                <Row gutter={[24, 24]}>
                    <Col xs={24} md={16}>
                        <Card style={{ marginBottom: 16 }}>
                            <Space direction="vertical" style={{ width: "100%" }}>
                                <div className="topic-question-bar">
                                    <div className="topic-question-tags">
                                        {currentQuestion.topicTitle && (
                                            <Tag color="purple">{currentQuestion.topicTitle}</Tag>
                                        )}
                                        <Tag color="blue">
                                            Question {currentQuestionIndex + 1} of {quizMeta.questions.length}
                                        </Tag>
                                    </div>
                                    <Text type="secondary">
                                        Submissions:{" "}
                                        <strong>
                                            {answeredCount} / {studentCount}
                                        </strong>
                                    </Text>
                                </div>
                                <Progress
                                    percent={
                                        studentCount > 0
                                            ? Math.round((answeredCount / studentCount) * 100)
                                            : 0
                                    }
                                    status="active"
                                />

                                <Title level={2} style={{ marginTop: 16 }}>
                                    {currentQuestion.question}
                                </Title>
                            </Space>
                        </Card>

                        {currentQuestion.options.map((opt, index) => {
                            const optionVotes = optionCounts[opt.id] ?? 0;
                            const votePercentage =
                                studentCount > 0 ? Math.round((optionVotes / studentCount) * 100) : 0;

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
                                                <strong style={{ fontSize: 18 }}>
                                                    {String.fromCharCode(65 + index)}.
                                                </strong>
                                                <Text style={{ fontSize: 18 }}>{opt.text}</Text>
                                                {isRevealed && opt.isCorrect && (
                                                    <Tag color="success">Correct Answer</Tag>
                                                )}
                                            </Space>
                                        </Col>
                                        <Col span={6} style={{ textAlign: "right" }}>
                                            {isRevealed && (
                                                <Text type="secondary">
                                                    {optionVotes} votes ({votePercentage}%)
                                                </Text>
                                            )}
                                        </Col>
                                    </Row>

                                    {isRevealed && opt.explanation && (
                                        <Alert
                                            type={opt.isCorrect ? "success" : "warning"}
                                            showIcon
                                            message={opt.isCorrect ? "Why it's right:" : "Why it's incorrect:"}
                                            description={opt.explanation}
                                            style={{ marginTop: 12 }}
                                        />
                                    )}
                                </Card>
                            );
                        })}

                        <Card style={{ marginTop: 24 }}>
                            <Row justify="space-between" align="middle">
                                <Col>
                                    <Button
                                        disabled={currentQuestionIndex === quizMeta.questions.length - 1}
                                        onClick={nextQuestion}
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
                                        <Tag color="gold" style={{ fontSize: 14, padding: "6px 12px" }}>
                                            Answers Revealed
                                        </Tag>
                                    )}
                                </Col>
                            </Row>
                        </Card>
                    </Col>

                    <Col xs={24} md={8}>
                        <Card
                            title="Student QR Join Code"
                            style={{ textAlign: "center" }}
                        >
                            <div
                                style={{
                                    background: "#fff",
                                    padding: 16,
                                    display: "inline-block",
                                    borderRadius: 8
                                }}
                            >
                                <QRCodeSVG value={joinUrl} size={180} />
                            </div>
                            <div style={{ marginTop: 12 }}>
                                <Text type="secondary">Scan with mobile camera or visit:</Text>
                                <br />
                                <Text copyable style={{ fontSize: 12 }}>
                                    {joinUrl}
                                </Text>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
}