import { Request, Response, NextFunction } from "express";
import { Notification } from "../models/notification.model.js";
import { AppError } from "../middleware/errorHandler.js";

/**
 * Lists the authenticated user's in-app notifications with unread count.
 */
export const getMyNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 20);
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ recipientUserId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ recipientUserId: req.user.id }),
      Notification.countDocuments({ recipientUserId: req.user.id, isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        notifications: notifications.map((n) => n.toJSON()),
        unreadCount,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Marks a single notification as read.
 */
export const markNotificationRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    const { id } = req.params;
    const notification = await Notification.findOne({
      _id: id,
      recipientUserId: req.user.id,
    });

    if (!notification) {
      return next(new AppError("Notification not found", 404, "NOT_FOUND"));
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      data: {
        notification: notification.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Marks all notifications for the authenticated user as read.
 */
export const markAllRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHENTICATED"));
    }

    await Notification.updateMany(
      { recipientUserId: req.user.id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      data: {
        markedAllRead: true,
      },
    });
  } catch (error) {
    next(error);
  }
};
