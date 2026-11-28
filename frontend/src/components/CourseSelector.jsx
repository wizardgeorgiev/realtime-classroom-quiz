import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Alert,
    Button,
    Card,
    Divider,
    Select,
    Space,
    Spin,
    Tag,
    Typography
} from "antd";

const { Title, Text } = Typography;

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
const ALL_TOPICS_VALUE = "__ALL_TOPICS__";

function getTopicQuestionCount(course, topicIndex) {
    if (!course || !Array.isArray(course.topics) || course.topics.length === 0) {
        return 0;
    }
    const safeIdx = Math.max(
        0,
        Math.min(Number(topicIndex) || 0, course.topics.length - 1)
    );
    return course.topics[safeIdx]?.questionCount || 0;
}

function formatSelectionLabel(course, selection) {
    if (!course) return "Selected Topic";
    const topics = course.topics || [];
    const safeIdx = Math.max(
        0,
        Math.min(Number(selection.topicIndex) || 0, topics.length - 1)
    );
    const topic = topics[safeIdx];
    const topicLabel = topic ? topic.title : `Topic ${safeIdx + 1}`;
    return `${course.title} — ${topicLabel}`;
}

export default function CourseSelector({ onStartQuiz }) {
    const navigate = useNavigate();

    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [addedSelections, setAddedSelections] = useState([]);
    const [currentCourseId, setCurrentCourseId] = useState(undefined);
    const [selectedTopicIndices, setSelectedTopicIndices] = useState([]);

    useEffect(() => {
        let active = true;

        async function loadCatalog() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE}/api/courses`);
                if (!res.ok) {
                    throw new Error(`Failed to load courses (${res.status})`);
                }
                const data = await res.json();
                const list = Array.isArray(data.courses) ? data.courses : [];
                if (active) {
                    setCourses(list);
                }
            } catch (err) {
                if (active) {
                    setError(err.message || "Could not load courses from server.");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadCatalog();
        return () => {
            active = false;
        };
    }, []);

    const currentCourse = useMemo(
        () => courses.find((course) => course.id === currentCourseId) || null,
        [courses, currentCourseId]
    );

    const topics = currentCourse?.topics || [];

    const allTopicIndices = useMemo(
        () => topics.map((_, idx) => idx),
        [topics]
    );

    const isAllSelected =
        topics.length > 0 && selectedTopicIndices.length === topics.length;

    const dropdownValue = useMemo(() => {
        if (isAllSelected) {
            return [ALL_TOPICS_VALUE, ...selectedTopicIndices];
        }
        return selectedTopicIndices;
    }, [isAllSelected, selectedTopicIndices]);

    const currentPreviewCount = useMemo(() => {
        if (!currentCourse || selectedTopicIndices.length === 0) return 0;
        return selectedTopicIndices.reduce(
            (sum, idx) => sum + getTopicQuestionCount(currentCourse, idx),
            0
        );
    }, [currentCourse, selectedTopicIndices]);

    const totalEstimatedQuestions = useMemo(() => {
        return addedSelections.reduce((sum, sel) => {
            const course = courses.find((c) => c.id === sel.courseId);
            return sum + getTopicQuestionCount(course, sel.topicIndex);
        }, 0);
    }, [addedSelections, courses]);

    const handleCourseChange = (courseId) => {
        setCurrentCourseId(courseId);
        setSelectedTopicIndices([]);
    };

    const handleTopicsChange = (values) => {
        const hasAllNow = values.includes(ALL_TOPICS_VALUE);
        const numericIndices = values.filter((v) => typeof v === "number");

        if (hasAllNow && !isAllSelected) {
            setSelectedTopicIndices(allTopicIndices);
            return;
        }

        if (!hasAllNow && isAllSelected) {
            setSelectedTopicIndices([]);
            return;
        }

        setSelectedTopicIndices(numericIndices.sort((a, b) => a - b));
    };

    const handleAddTopics = () => {
        if (!currentCourse || selectedTopicIndices.length === 0) return;

        setAddedSelections((prev) => {
            const existingKeys = new Set(
                prev.map((item) => `${item.courseId}:${item.topicIndex}`)
            );
            const next = [...prev];

            for (const topicIndex of selectedTopicIndices) {
                const qCount = getTopicQuestionCount(currentCourse, topicIndex);
                const key = `${currentCourse.id}:${topicIndex}`;
                if (qCount > 0 && !existingKeys.has(key)) {
                    existingKeys.add(key);
                    next.push({
                        courseId: currentCourse.id,
                        topicIndex,
                        mode: "single"
                    });
                }
            }

            return next;
        });

        setSelectedTopicIndices([]);
        setCurrentCourseId(undefined);
    };

    const handleRemoveSelection = (indexToRemove) => {
        setAddedSelections((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const canStartBigScreen =
        addedSelections.length > 0 && totalEstimatedQuestions > 0;

    const handleStartBigScreen = () => {
        if (!canStartBigScreen) return;

        if (typeof onStartQuiz === "function") {
            onStartQuiz(addedSelections);
        } else {
            navigate("/teacher/new", {
                state: { selections: addedSelections }
            });
        }
    };

    const totalCourseQuestions = useMemo(
        () =>
            topics.reduce((sum, topic) => sum + (topic.questionCount || 0), 0),
        [topics]
    );

    const topicDropdownOptions = useMemo(() => {
        if (!currentCourse) return [];
        return [
            {
                value: ALL_TOPICS_VALUE,
                searchLabel: "All Topics",
                label: (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                            fontWeight: 600
                        }}
                    >
                        <span>All Topics ({topics.length})</span>
                        <Tag color="geekblue" style={{ margin: 0 }}>
                            {totalCourseQuestions} Q
                        </Tag>
                    </div>
                )
            },
            ...topics.map((topic, idx) => ({
                value: idx,
                searchLabel: `${idx + 1}. ${topic.title}`,
                label: (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8
                        }}
                    >
                        <span>
                            {idx + 1}. {topic.title}
                        </span>
                        <Tag
                            color={(topic.questionCount || 0) > 0 ? "blue" : "default"}
                            style={{ margin: 0 }}
                        >
                            {topic.questionCount || 0} Q
                        </Tag>
                    </div>
                )
            }))
        ];
    }, [currentCourse, topics, totalCourseQuestions]);

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                padding: 24,
                background: "#f0f2f5"
            }}
        >
            <Card style={{ width: "100%", maxWidth: 640 }}>
                {loading ? (
                    <div style={{ padding: 36, textAlign: "center" }}>
                        <Spin size="large" />
                        <div style={{ marginTop: 12 }}>
                            <Text type="secondary">Loading courses from server...</Text>
                        </div>
                    </div>
                ) : error ? (
                    <Alert
                        type="error"
                        showIcon
                        message="Unable to Load Courses"
                        description={error}
                    />
                ) : courses.length === 0 ? (
                    <Alert
                        type="warning"
                        showIcon
                        message="No Courses Available"
                        description="No courses were returned by the server."
                    />
                ) : (
                    <Space direction="vertical" style={{ width: "100%" }} size="large">
                        <div>
                            <Title level={3} style={{ margin: 0 }}>
                                Build Classroom Quiz
                            </Title>
                            <Text type="secondary">
                                Select a course first, then choose one or more topics to add to your session.
                            </Text>
                        </div>

                        {/* Step 1: Course Selector */}
                        <div>
                            <Text strong style={{ display: "block", marginBottom: 8 }}>
                                1. Select Course
                            </Text>
                            <Select
                                size="large"
                                showSearch
                                allowClear
                                optionFilterProp="label"
                                placeholder="Choose a course..."
                                value={currentCourseId}
                                onChange={handleCourseChange}
                                style={{ width: "100%" }}
                                options={courses.map((course) => ({
                                    value: course.id,
                                    label: `${course.title} (${course.subject})`
                                }))}
                            />
                        </div>

                        {/* Step 2: Multi-Topic Selector (revealed after course selection) */}
                        {currentCourse && (
                            <>
                                <div>
                                    <Text strong style={{ display: "block", marginBottom: 8 }}>
                                        2. Select Topics
                                    </Text>
                                    <Select
                                        mode="multiple"
                                        size="large"
                                        allowClear
                                        showSearch
                                        maxTagCount="responsive"
                                        optionFilterProp="searchLabel"
                                        placeholder={`Choose topics from ${currentCourse.title}...`}
                                        value={dropdownValue}
                                        onChange={handleTopicsChange}
                                        style={{ width: "100%" }}
                                        options={topicDropdownOptions}
                                    />
                                </div>

                                <Button
                                    size="large"
                                    block
                                    disabled={
                                        selectedTopicIndices.length === 0 ||
                                        currentPreviewCount === 0
                                    }
                                    onClick={handleAddTopics}
                                >
                                    {selectedTopicIndices.length === 0
                                        ? "Select topics to add"
                                        : `Add ${selectedTopicIndices.length} Topic${
                                              selectedTopicIndices.length !== 1 ? "s" : ""
                                          } (${currentPreviewCount} Q)`}
                                </Button>
                            </>
                        )}

                        {/* Added Quiz Parts */}
                        <div>
                            <Divider style={{ margin: "4px 0 16px" }} />
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 8
                                }}
                            >
                                <Text strong>Added Quiz Parts ({addedSelections.length})</Text>
                                <Tag color={canStartBigScreen ? "geekblue" : "default"}>
                                    {totalEstimatedQuestions} total question
                                    {totalEstimatedQuestions !== 1 ? "s" : ""}
                                </Tag>
                            </div>

                            {addedSelections.length === 0 ? (
                                <Card size="small" style={{ background: "#fafafa" }}>
                                    <Text type="secondary">
                                        No topics added yet. Select a course and topics above to build your quiz.
                                    </Text>
                                </Card>
                            ) : (
                                <Space direction="vertical" style={{ width: "100%" }} size="small">
                                    {addedSelections.map((sel, idx) => {
                                        const course = courses.find((c) => c.id === sel.courseId);
                                        const qCount = getTopicQuestionCount(
                                            course,
                                            sel.topicIndex
                                        );
                                        return (
                                            <Card
                                                key={`${sel.courseId}-${sel.topicIndex}-${idx}`}
                                                size="small"
                                                style={{ background: "#fafafa" }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        gap: 8
                                                    }}
                                                >
                                                    <div>
                                                        <Text strong>
                                                            {formatSelectionLabel(course, sel)}
                                                        </Text>
                                                        <div>
                                                            <Tag color="blue" style={{ marginTop: 4 }}>
                                                                {qCount} question
                                                                {qCount !== 1 ? "s" : ""}
                                                            </Tag>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="small"
                                                        danger
                                                        type="text"
                                                        onClick={() => handleRemoveSelection(idx)}
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </Space>
                            )}
                        </div>

                        {/* Start Big Screen */}
                        <Button
                            type="primary"
                            block
                            size="large"
                            disabled={!canStartBigScreen}
                            onClick={handleStartBigScreen}
                        >
                            Start Big Screen
                        </Button>
                    </Space>
                )}
            </Card>
        </div>
    );
}