/**
 * 公益纪实模块控制器
 * 处理公益活动、报名、成果展示等相关业务逻辑
 */

// 导入数据库模型
// const PublicWelfareModel = require('../models/publicWelfareModel');

/**
 * 公益纪实控制器方法
 */
const PublicWelfareController = {
  /**
   * 获取公益活动列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getActivitiesList(req, res) {
    try {
      const { page = 1, limit = 10, status, location, organization } = req.query;
      // const activities = await PublicWelfareModel.getActivities({
      //   page: parseInt(page),
      //   limit: parseInt(limit),
      //   status,
      //   location,
      //   organization
      // });
      
      // 模拟数据
      const activities = {
        items: [
          {
            id: 1,
            title: '绣红旗公益活动进社区',
            description: '组织社区居民学习红旗刺绣技艺',
            excerpt: '走进社区，传授传统刺绣技艺...',
            content: '详细活动内容...',
            coverImage: '/uploads/images/welfare-community.jpg',
            startTime: '2026-04-01T09:00:00Z',
            endTime: '2026-04-01T17:00:00Z',
            location: '湖北省武汉市武昌区东湖路169号',
            organizer: '湖北田羲之科技有限公司',
            maxParticipants: 100,
            currentParticipants: 45,
            status: 'upcoming',
            registrationDeadline: '2026-03-25T23:59:59Z',
            createdAt: '2026-02-28T10:00:00Z'
          },
          {
            id: 2,
            title: '红旗文化公益讲座',
            description: '面向公众的红旗文化知识普及',
            excerpt: '专家学者讲解红旗文化内涵...',
            content: '详细讲座内容...',
            coverImage: '/uploads/images/welfare-lecture.jpg',
            startTime: '2026-04-15T14:00:00Z',
            endTime: '2026-04-15T16:30:00Z',
            location: '上海市黄浦区',
            organizer: '红色文化研究会',
            maxParticipants: 200,
            currentParticipants: 187,
            status: 'upcoming',
            registrationDeadline: '2026-04-10T23:59:59Z',
            createdAt: '2026-02-25T15:30:00Z'
          }
        ],
        pagination: {
          total: 2,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 1
        }
      };
      
      res.json({
        success: true,
        data: activities,
        message: '获取活动列表成功'
      });
    } catch (error) {
      console.error('获取活动列表失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取活动列表失败'
      });
    }
  },

  /**
   * 获取活动详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getActivityDetail(req, res) {
    try {
      const { id } = req.params;
      // const activity = await PublicWelfareModel.getActivityById(id);
      
      // 模拟数据
      const activity = {
        id: parseInt(id),
        title: '绣红旗公益活动进社区',
        description: '组织社区居民学习红旗刺绣技艺',
        content: '<h1>绣红旗公益活动进社区</h1><p>详细活动内容...</p>',
        coverImage: '/uploads/images/welfare-community.jpg',
        startTime: '2026-04-01T09:00:00Z',
        endTime: '2026-04-01T17:00:00Z',
        location: '湖北省武汉市武昌区东湖路169号',
        address: '湖北省武汉市武昌区东湖路169号',
        organizer: '湖北田羲之科技有限公司',
        contactPerson: '王主任',
        contactPhone: '010-12345678',
        contactEmail: 'contact@xiuhongqi.com',
        maxParticipants: 100,
        currentParticipants: 45,
        status: 'upcoming',
        registrationDeadline: '2026-03-25T23:59:59Z',
        registrationOpen: true,
        createdAt: '2026-02-28T10:00:00Z',
        updatedAt: '2026-03-01T14:20:00Z',
        achievements: [
          { id: 1, description: '已成功举办3场社区活动', count: 3 },
          { id: 2, description: '累计培训学员150人', count: 150 }
        ]
      };
      
      if (!activity) {
        return res.status(404).json({
          success: false,
          error: 'RESOURCE_NOT_FOUND',
          message: '活动不存在'
        });
      }
      
      res.json({
        success: true,
        data: activity,
        message: '获取活动详情成功'
      });
    } catch (error) {
      console.error('获取活动详情失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取活动详情失败'
      });
    }
  },

  /**
   * 创建新活动
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createActivity(req, res) {
    try {
      const activityData = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '用户未认证'
        });
      }
      
      // 只有管理员可以创建活动
      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: '没有权限创建活动'
        });
      }
      
      // 验证必要字段
      const requiredFields = ['title', 'description', 'startTime', 'location'];
      for (const field of requiredFields) {
        if (!activityData[field]) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: `字段 "${field}" 是必填字段`
          });
        }
      }
      
      // 验证时间格式
      if (activityData.startTime && new Date(activityData.startTime) <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '活动开始时间必须晚于当前时间'
        });
      }
      
      // const newActivity = await PublicWelfareModel.createActivity({
      //   ...activityData,
      //   createdBy: userId,
      //   status: 'draft' // 默认保存为草稿
      // });
      
      // 模拟数据
      const newActivity = {
        id: Date.now(),
        ...activityData,
        createdBy: userId,
        currentParticipants: 0,
        status: 'draft',
        registrationOpen: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json({
        success: true,
        data: newActivity,
        message: '活动创建成功'
      });
    } catch (error) {
      console.error('创建活动失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '创建活动失败'
      });
    }
  },

  /**
   * 更新活动
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updateActivity(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      // 验证权限
      // const activity = await PublicWelfareModel.getActivityById(id);
      // if (!activity) {
      //   return res.status(404).json({
      //     success: false,
      //     error: 'RESOURCE_NOT_FOUND',
      //     message: '活动不存在'
      //   });
      // }
      
      // 只有创建者或管理员可以更新
      // if (activity.createdBy !== userId && userRole !== 'admin') {
      //   return res.status(403).json({
      //     success: false,
      //     error: 'FORBIDDEN',
      //     message: '没有权限修改此活动'
      //   });
      // }
      
      // const updatedActivity = await PublicWelfareModel.updateActivity(id, updateData);
      
      // 模拟数据
      const updatedActivity = {
        id: parseInt(id),
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: updatedActivity,
        message: '活动更新成功'
      });
    } catch (error) {
      console.error('更新活动失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '更新活动失败'
      });
    }
  },

  /**
   * 删除活动
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async deleteActivity(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      // 验证权限逻辑同上...
      
      // await PublicWelfareModel.deleteActivity(id);
      
      res.json({
        success: true,
        data: { id: parseInt(id) },
        message: '活动删除成功'
      });
    } catch (error) {
      console.error('删除活动失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '删除活动失败'
      });
    }
  },

  /**
   * 报名参加活动
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async registerActivity(req, res) {
    try {
      const { id } = req.params;
      const { participantName, phone, email, note } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '用户未认证'
        });
      }
      
      // 验证必要字段
      if (!participantName || !phone) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '姓名和电话是必填字段'
        });
      }
      
      // 验证手机号格式
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '请输入有效的手机号码'
        });
      }
      
      // 检查活动状态
      // const activity = await PublicWelfareModel.getActivityById(id);
      // if (!activity) {
      //   return res.status(404).json({
      //     success: false,
      //     error: 'RESOURCE_NOT_FOUND',
      //     message: '活动不存在'
      //   });
      // }
      
      // if (activity.status !== 'upcoming' || !activity.registrationOpen) {
      //   return res.status(400).json({
      //     success: false,
      //     error: 'VALIDATION_ERROR',
      //     message: '活动当前不接受报名'
      //   });
      // }
      
      // if (activity.currentParticipants >= activity.maxParticipants) {
      //   return res.status(400).json({
      //     success: false,
      //     error: 'VALIDATION_ERROR',
      //     message: '活动名额已满'
      //   });
      // }
      
      // 检查是否已经报名
      // const alreadyRegistered = await PublicWelfareModel.checkRegistration(id, userId);
      // if (alreadyRegistered) {
      //   return res.status(409).json({
      //     success: false,
      //     error: 'RESOURCE_ALREADY_EXISTS',
      //     message: '您已经报名此活动'
      //   });
      // }
      
      // const registration = await PublicWelfareModel.createRegistration({
      //   activityId: id,
      //   userId,
      //   participantName,
      //   phone,
      //   email,
      //   note
      // });
      
      // 模拟数据
      const registration = {
        id: Date.now(),
        activityId: parseInt(id),
        userId,
        participantName,
        phone,
        email,
        note,
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };
      
      res.status(201).json({
        success: true,
        data: registration,
        message: '报名成功'
      });
    } catch (error) {
      console.error('报名失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '报名失败'
      });
    }
  },

  /**
   * 获取活动报名列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getActivityRegistrations(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      // 验证权限
      // const activity = await PublicWelfareModel.getActivityById(id);
      // if (!activity) {
      //   return res.status(404).json({
      //     success: false,
      //     error: 'RESOURCE_NOT_FOUND',
      //     message: '活动不存在'
      //   });
      // }
      
      // 只有活动创建者或管理员可以查看报名列表
      // if (activity.createdBy !== userId && userRole !== 'admin') {
      //   return res.status(403).json({
      //     success: false,
      //     error: 'FORBIDDEN',
      //     message: '没有权限查看报名列表'
      //   });
      // }
      
      // const registrations = await PublicWelfareModel.getRegistrations(id, {
      //   page: parseInt(page),
      //   limit: parseInt(limit)
      // });
      
      // 模拟数据
      const registrations = {
        items: [
          {
            id: 1,
            participantName: '张三',
            phone: '13800138000',
            email: 'zhangsan@example.com',
            note: '我有刺绣经验',
            status: 'confirmed',
            registeredAt: '2026-03-02T14:30:00Z'
          },
          {
            id: 2,
            participantName: '李四',
            phone: '13900139000',
            email: 'lisi@example.com',
            note: '初学者，想学习',
            status: 'confirmed',
            registeredAt: '2026-03-03T09:15:00Z'
          }
        ],
        pagination: {
          total: 2,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 1
        }
      };
      
      res.json({
        success: true,
        data: registrations,
        message: '获取报名列表成功'
      });
    } catch (error) {
      console.error('获取报名列表失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取报名列表失败'
      });
    }
  },

  /**
   * 获取活动成果
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getActivityAchievements(req, res) {
    try {
      const { id } = req.params;
      
      // const achievements = await PublicWelfareModel.getAchievements(id);
      
      // 模拟数据
      const achievements = [
        {
          id: 1,
          title: '社区活动覆盖人数',
          description: '累计在5个社区开展活动',
          count: 5,
          unit: '个社区'
        },
        {
          id: 2,
          title: '培训学员总数',
          description: '累计培训刺绣爱好者',
          count: 150,
          unit: '人'
        },
        {
          id: 3,
          title: '红旗作品产出',
          description: '学员完成的红旗刺绣作品',
          count: 87,
          unit: '件'
        }
      ];
      
      res.json({
        success: true,
        data: achievements,
        message: '获取活动成果成功'
      });
    } catch (error) {
      console.error('获取活动成果失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取活动成果失败'
      });
    }
  },

  /**
   * 添加活动成果
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async addAchievement(req, res) {
    try {
      const { id } = req.params;
      const { title, description, count, unit } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '用户未认证'
        });
      }
      
      // 只有管理员可以添加成果
      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: '没有权限添加活动成果'
        });
      }
      
      // 验证必要字段
      if (!title || !description || count === undefined) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '标题、描述和数量是必填字段'
        });
      }
      
      // const achievement = await PublicWelfareModel.createAchievement({
      //   activityId: id,
      //   title,
      //   description,
      //   count,
      //   unit: unit || '项',
      //   addedBy: userId
      // });
      
      // 模拟数据
      const achievement = {
        id: Date.now(),
        activityId: parseInt(id),
        title,
        description,
        count,
        unit: unit || '项',
        addedBy: userId,
        createdAt: new Date().toISOString()
      };
      
      res.status(201).json({
        success: true,
        data: achievement,
        message: '添加成果成功'
      });
    } catch (error) {
      console.error('添加成果失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '添加成果失败'
      });
    }
  },

  /**
   * 获取活动状态统计
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getActivityStats(req, res) {
    try {
      // const stats = await PublicWelfareModel.getStats();
      
      // 模拟数据
      const stats = {
        totalActivities: 15,
        upcomingActivities: 4,
        ongoingActivities: 2,
        completedActivities: 9,
        totalParticipants: 1250,
        averageParticipationRate: 83.5
      };
      
      res.json({
        success: true,
        data: stats,
        message: '获取活动统计成功'
      });
    } catch (error) {
      console.error('获取活动统计失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取活动统计失败'
      });
    }
  }
};

module.exports = PublicWelfareController;