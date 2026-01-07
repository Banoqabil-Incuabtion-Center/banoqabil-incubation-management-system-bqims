import React, { useEffect, useState } from "react";
import { Calendar, Badge, Modal, Form, Input, Select, DatePicker, Button, App } from "antd";
import type { CalendarProps } from "antd";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { calendarRepo } from "@/repositories/calendarRepo";
import type { CalendarEntry } from "@/repositories/calendarRepo";
import { Card, CardContent } from "@/components/ui/card";
import { IconPlus } from "@tabler/icons-react";

const { Option } = Select;
const { RangePicker } = DatePicker;

const AdminCalendar: React.FC = () => {
    const [entries, setEntries] = useState<CalendarEntry[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null);
    const [form] = Form.useForm();
    const { message, modal } = App.useApp();

    const fetchEntries = async () => {
        try {
            const res = await calendarRepo.getEntries();
            setEntries(res.data);
        } catch (error) {
            message.error("Failed to fetch calendar entries");
        }
    };

    useEffect(() => {
        fetchEntries();
    }, []);

    const getListData = (value: Dayjs) => {
        return entries.filter((entry) => {
            const start = dayjs(entry.startDate).startOf("day");
            const end = dayjs(entry.endDate).endOf("day");
            return value.isAfter(start.subtract(1, 'day')) && value.isBefore(end.add(1, 'day'));
        });
    };

    const dateCellRender = (value: Dayjs) => {
        const listData = getListData(value);
        return (
            <ul className="events m-0 p-0 list-none">
                {listData.map((item) => (
                    <li key={item._id} onClick={(e) => {
                        e.stopPropagation();
                        onEditEntry(item);
                    }}>
                        <Badge
                            color={item.color}
                            text={item.title}
                            className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-[10px]"
                        />
                    </li>
                ))}
            </ul>
        );
    };

    const onAddEntry = () => {
        setEditingEntry(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const onEditEntry = (entry: CalendarEntry) => {
        setEditingEntry(entry);
        form.setFieldsValue({
            ...entry,
            range: [dayjs(entry.startDate), dayjs(entry.endDate)],
        });
        setIsModalOpen(true);
    };

    const handleSave = async (values: any) => {
        const data: any = {
            ...values,
            startDate: values.range[0].toISOString(),
            endDate: values.range[1].toISOString(),
        };
        delete data.range;

        try {
            if (editingEntry?._id) {
                await calendarRepo.updateEntry(editingEntry._id, data);
                message.success("Entry updated successfully");
            } else {
                await calendarRepo.createEntry(data);
                message.success("Entry created successfully");
            }
            setIsModalOpen(false);
            fetchEntries();
        } catch (error: any) {
            message.error(error.response?.data?.message || "Failed to save entry");
        }
    };

    const handleDelete = async () => {
        if (!editingEntry?._id) return;

        modal.confirm({
            title: "Are you sure you want to delete this entry?",
            content: "This action cannot be undone.",
            okText: "Yes, Delete",
            okType: "danger",
            cancelText: "No",
            onOk: async () => {
                try {
                    await calendarRepo.deleteEntry(editingEntry._id!);
                    message.success("Entry deleted successfully");
                    setIsModalOpen(false);
                    fetchEntries();
                } catch (error) {
                    message.error("Failed to delete entry");
                }
            },
        });
    };

    const cellRender: CalendarProps<Dayjs>['cellRender'] = (current, info) => {
        if (info.type === 'date') return dateCellRender(current);
        return info.originNode;
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Incubation Calendar</h1>
                    <p className="text-muted-foreground mt-1">Manage holidays, events, and meetings.</p>
                </div>
                <Button onClick={onAddEntry} type="primary" icon={<IconPlus size={18} />} className="flex items-center gap-2">
                    Add Entry
                </Button>
            </div>

            <Card className="border-none shadow-sm h-full">
                <CardContent className="p-4">
                    <Calendar cellRender={cellRender} className="p-2" />
                </CardContent>
            </Card>

            <Modal
                title={editingEntry ? "Edit Calendar Entry" : "Add Calendar Entry"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ type: "Event", color: "#3b82f6", status: "Upcoming", recurrence: "None" }}>
                    <Form.Item name="title" label="Title" rules={[{ required: true, message: "Please enter a title" }]}>
                        <Input placeholder="E.g. Public Holiday, Team Meeting" />
                    </Form.Item>

                    <Form.Item name="type" label="Entry Type" rules={[{ required: true }]}>
                        <Select>
                            <Option value="Holiday">Holiday</Option>
                            <Option value="Event">Event</Option>
                            <Option value="Meeting">Meeting</Option>
                            <Option value="Working Day">Working Day</Option>
                            <Option value="Other">Other</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="range" label="Date Range" rules={[{ required: true }]}>
                        <RangePicker className="w-full" />
                    </Form.Item>

                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={3} />
                    </Form.Item>

                    <div className="grid grid-cols-2 gap-4">
                        <Form.Item name="color" label="Label Color">
                            <Select>
                                <Option value="#3b82f6"><Badge color="#3b82f6" text="Blue (Default)" /></Option>
                                <Option value="#ef4444"><Badge color="#ef4444" text="Red (Holiday)" /></Option>
                                <Option value="#10b981"><Badge color="#10b981" text="Green (Success)" /></Option>
                                <Option value="#f59e0b"><Badge color="#f59e0b" text="Orange (Event)" /></Option>
                                <Option value="#8b5cf6"><Badge color="#8b5cf6" text="Purple (Meeting)" /></Option>
                            </Select>
                        </Form.Item>

                        <Form.Item name="status" label="Status">
                            <Select>
                                <Option value="Upcoming">Upcoming</Option>
                                <Option value="Completed">Completed</Option>
                                <Option value="Cancelled">Cancelled</Option>
                            </Select>
                        </Form.Item>
                    </div>

                    <Form.Item name="location" label="Location">
                        <Input placeholder="E.g. Main Hall, Zoom, Campus B" />
                    </Form.Item>

                    <div className="flex justify-between pt-4 border-t gap-2">
                        {editingEntry && (
                            <Button danger onClick={handleDelete}>
                                Delete
                            </Button>
                        )}
                        <div className="flex gap-2 ml-auto">
                            <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit">
                                {editingEntry ? "Update Entry" : "Create Entry"}
                            </Button>
                        </div>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminCalendar;
