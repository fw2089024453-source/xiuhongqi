/**
 * 技艺教学模块控制器
 * 处理教学课程、学习进度、分类等相关业务逻辑
 */

// 导入数据库模型
// const SkillTeachingModel = require('../models/skillTeachingModel');

/**
 * 技艺教学控制器方法
 */
const SkillTeachingController = {
  /**
   * 获取课程列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getCoursesList(req, res) {
    try {
      const { page = 1, limit = 10, level, category, instructor } = req.query;
      // const courses = await SkillTeachingModel.getCourses({
      //   page: parseInt(page),
      //   limit: parseInt(limit),
      //   level,
      //   category,
      //   instructor
      // });
      
      // 模拟数据
      const courses = {
        items: [
          {
            id: 1,
            title: '基础红旗刺绣入门教程',
            description: '从零开始学习红旗刺绣基础技法',
            excerpt: '适合初学者的红旗刺绣入门课程...',
            content: '详细课程内容...',
            coverImage: '/uploads/images/course-basic.jpg',
            level: 'beginner',
            category: 'stitching',
            duration: 120, // 分钟
            instructor: { id: 1, name: '王老师', title: '刺绣非遗传承人' },
            price: 0, // 免费
            studentCount: 245,
            averageRating: 4.8,
            lessonCount: 12,
            status: 'published',
            createdAt: '2026-02-20T10:00:00Z',
            updatedAt: '2026-03-01T14:30:00Z'
          },
          {
            id: 2,
            title: '高级红旗图案设计',
            description: '学习红旗刺绣的高级图案设计与技法',
            excerpt: '提升红旗刺绣设计能力的进阶课程...',
            content: '详细课程内容...',
            coverImage: '/uploads/images/course-advanced.jpg',
            level: 'advanced',
            category: 'design',
            duration: 180,
            instructor: { id: 2, name: '李教授', title: '美术设计专家' },
            price: 199,
            studentCount: 87,
            averageRating: 4.9,
            lessonCount: 8,
            status: 'published',
            createdAt: '2026-02-15T14:20:00Z'
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
        data: courses,
        message: '获取课程列表成功'
      });
    } catch (error) {
      console.error('获取课程列表失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取课程列表失败'
      });
    }
  },

  /**
   * 获取课程详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getCourseDetail(req, res) {
    try {
      const { id } = req.params;
      // const course = await SkillTeachingModel.getCourseById(id);
      
      // 模拟数据
      const course = {
        id: parseInt(id),
        title: '基础红旗刺绣入门教程',
        description: '从零开始学习红旗刺绣基础技法',
        content: '<h1>基础红旗刺绣入门教程</h1><p>详细课程内容...</p>',
        coverImage: '/uploads/images/course-basic.jpg',
        level: 'beginner',
        category: 'stitching',
        duration: 120,
        instructor: {
          id: 1,
          name: '王老师',
          title: '刺绣非遗传承人',
          avatar: '/uploads/avatars/instructor1.jpg',
          bio: '30年刺绣经验，国家级非遗传承人'
        },
        price: 0,
        studentCount: 245,
        averageRating: 4.8,
        ratingCount: 189,
        lessonCount: 12,
        lessons: [
          { id: 1, title: '刺绣工具介绍', duration: 10, type: 'video' },
          { id: 2, title: '基本针法演示', duration: 15, type: 'video' }
        ],
        prerequisites: '无需刺绣经验',
        learningOutcomes: ['掌握基础针法', '能独立完成简单红旗刺绣'],
        materials: '刺绣针、红线、布料',
        status: 'published',
        createdAt: '2026-02-20T10:00:00Z',
        updatedAt: '2026-03-01T14:30:00Z',
        relatedCourses: [
          { id: 3, title: '中级刺绣技法提升', level: 'intermediate' },
          { id: 4, title: '红旗图案色彩搭配', category: 'design' }
        ]
      };
      
      if (!course) {
        return res.status(404).json({
          success: false,
          error: 'RESOURCE_NOT_FOUND',
          message: '课程不存在'
        });
      }
      
      res.json({
        success: true,
        data: course,
        message: '获取课程详情成功'
      });
    } catch (error) {
      console.error('获取课程详情失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取课程详情失败'
      });
    }
  },

  /**
   * 创建新课程
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createCourse(req, res) {
    try {
      const courseData = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '用户未认证'
        });
      }
      
      // 只有讲师或管理员可以创建课程
      if (!['instructor', 'admin'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: '没有权限创建课程'
        });
      }
      
      // 验证必要字段
      const requiredFields = ['title', 'description', 'level', 'category'];
      for (const field of requiredFields) {
        if (!courseData[field]) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: `字段 "${field}" 是必填字段`
          });
        }
      }
      
      // 验证难度级别
      const validLevels = ['beginner', 'intermediate', 'advanced'];
      if (!validLevels.includes(courseData.level)) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: `难度级别必须是: ${validLevels.join(', ')}`
        });
      }
      
      // const newCourse = await SkillTeachingModel.createCourse({
      //   ...courseData,
      //   instructorId: userId,
      //   status: 'draft' // 默认保存为草稿
      // });
      
      // 模拟数据
      const newCourse = {
        id: Date.now(),
        ...courseData,
        instructorId: userId,
        studentCount: 0,
        averageRating: 0,
        ratingCount: 0,
        lessonCount: 0,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json({
        success: true,
        data: newCourse,
        message: '课程创建成功'
      });
    } catch (error) {
      console.error('创建课程失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '创建课程失败'
      });
    }
  },

  /**
   * 更新课程
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updateCourse(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      // 验证权限
      // const course = await SkillTeachingModel.getCourseById(id);
      // if (!course) {
      //   return res.status(404).json({
      //     success: false,
      //     error: 'RESOURCE_NOT_FOUND',
      //     message: '课程不存在'
      //   });
      // }
      
      // 只有课程讲师或管理员可以更新
      // if (course.instructorId !== userId && userRole !== 'admin') {
      //   return res.status(403).json({
      //     success: false,
      //     error: 'FORBIDDEN',
      //     message: '没有权限修改此课程'
      //   });
      // }
      
      // const updatedCourse = await SkillTeachingModel.updateCourse(id, updateData);
      
      // 模拟数据
      const updatedCourse = {
        id: parseInt(id),
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: updatedCourse,
        message: '课程更新成功'
      });
    } catch (error) {
      console.error('更新课程失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '更新课程失败'
      });
    }
  },

  /**
   * 删除课程
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async deleteCourse(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      // 验证权限逻辑同上...
      
      // await SkillTeachingModel.deleteCourse(id);
      
      res.json({
        success: true,
        data: { id: parseInt(id) },
        message: '课程删除成功'
      });
    } catch (error) {
      console.error('删除课程失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '删除课程失败'
      });
    }
  },

  /**
   * 获取用户学习进度
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserProgress(req, res) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '用户未认证'
        });
      }
      
      // const progress = await SkillTeachingModel.getUserProgress(userId);
      
      // 模拟数据
      const progress = {
        enrolledCourses: [
          {
            courseId: 1,
            courseTitle: '基础红旗刺绣入门教程',
            progress: 85,
            completedLessons: 10,
            totalLessons: 12,
            lastAccessed: '2026-03-03T15:30:00Z'
          },
          {
            courseId: 2,
            courseTitle: '高级红旗图案设计',
            progress: 30,
            completedLessons: 3,
            totalLessons: 8,
            lastAccessed: '2026-03-02T09:15:00Z'
          }
        ],
        totalEnrolled: 2,
        completedCourses: 0,
        totalStudyTime: 1560, // 分钟
        averageCompletionRate: 57.5
      };
      
      res.json({
        success: true,
        data: progress,
        message: '获取学习进度成功'
      });
    } catch (error) {
      console.error('获取学习进度失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取学习进度失败'
      });
    }
  },

  /**
   * 更新学习进度
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updateProgress(req, res) {
    try {
      const { id } = req.params;
      const { completed, progress, lastPosition } = req.body;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: '用户未认证'
        });
      }
      
      // 验证课程存在
      // const course = await SkillTeachingModel.getCourseById(id);
      // if (!course) {
      //   return res.status(404).json({
      //     success: false,
      //     error: 'RESOURCE_NOT_FOUND',
      //     message: '课程不存在'
      //   });
      // }
      
      // 检查用户是否已报名
      // const enrollment = await SkillTeachingModel.getEnrollment(id, userId);
      // if (!enrollment) {
      //   return res.status(400).json({
      //     success: false,
      //     error: 'VALIDATION_ERROR',
      //     message: '请先报名此课程'
      //   });
      // }
      
      // const updatedProgress = await SkillTeachingModel.updateProgress({
      //   courseId: id,
      //   userId,
      //   completed,
      //   progress,
      //   lastPosition
      // });
      
      // 模拟数据
      const updatedProgress = {
        courseId: parseInt(id),
        userId,
        completed: completed || false,
        progress: progress || 0,
        lastPosition: lastPosition || 0,
        updatedAt: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: updatedProgress,
        message: '更新学习进度成功'
      });
    } catch (error) {
      console.error('更新学习进度失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '更新学习进度失败'
      });
    }
  },

  /**
   * 获取课程分类
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getCategories(req, res) {
    try {
      // const categories = await SkillTeachingModel.getCategories();
      
      // 模拟数据
      const categories = [
        { 
          id: 1, 
          name: '基础针法', 
          description: '刺绣基础针法教学',
          courseCount: 8,
          icon: 'stitch'
        },
        { 
          id: 2, 
          name: '图案设计', 
          description: '红旗图案设计与创新',
          courseCount: 6,
          icon: 'design'
        },
        { 
          id: 3, 
          name: '色彩搭配', 
          description: '刺绣色彩理论与搭配',
          courseCount: 4,
          icon: 'color'
        },
        { 
          id: 4, 
          name: '传统技艺', 
          description: '传统红旗刺绣技法',
          courseCount: 5,
          icon: 'traditional'
        },
        { 
          id: 5, 
          name: '数字刺绣', 
          description: '数字技术与刺绣结合',
          courseCount: 3,
          icon: 'digital'
        }
      ];
      
      res.json({
        success: true,
        data: categories,
        message: '获取分类列表成功'
      });
    } catch (error) {
      console.error('获取分类列表失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取分类列表失败'
      });
    }
  },

  /**
   * 获取讲师信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getInstructors(req, res) {
    try {
      // const instructors = await SkillTeachingModel.getInstructors();
      
      // 模拟数据
      const instructors = [
        {
          id: 1,
          name: '王老师',
          title: '刺绣非遗传承人',
          avatar: '/uploads/avatars/instructor1.jpg',
          bio: '30年刺绣经验，国家级非遗传承人，擅长传统红旗刺绣技法',
          courseCount: 5,
          studentCount: 1245,
          averageRating: 4.9
        },
        {
          id: 2,
          name: '李教授',
          title: '美术设计专家',
          avatar: '/uploads/avatars/instructor2.jpg',
          bio: '美术院校教授，专注于刺绣图案设计与创新，多次获得设计奖项',
          courseCount: 3,
          studentCount: 876,
          averageRating: 4.8
        },
        {
          id: 3,
          name: '张师傅',
          title: '民间刺绣艺人',
          avatar: '/uploads/avatars/instructor3.jpg',
          bio: '祖传刺绣技艺，擅长红旗传统图案，教学风格亲切易懂',
          courseCount: 2,
          studentCount: 543,
          averageRating: 4.7
        }
      ];
      
      res.json({
        success: true,
        data: instructors,
        message: '获取讲师列表成功'
      });
    } catch (error) {
      console.error('获取讲师列表失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取讲师列表失败'
      });
    }
  },

  /**
   * 课程搜索
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async searchCourses(req, res) {
    try {
      const { q, page = 1, limit = 10 } = req.query;
      
      if (!q || q.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '搜索关键词不能为空'
        });
      }
      
      // const results = await SkillTeachingModel.searchCourses(q, {
      //   page: parseInt(page),
      //   limit: parseInt(limit)
      // });
      
      // 模拟数据
      const results = {
        items: [
          {
            id: 1,
            title: '基础红旗刺绣入门教程',
            description: '从零开始学习红旗刺绣基础技法',
            excerpt: '包含搜索关键词的相关内容...',
            level: 'beginner',
            category: 'stitching',
            instructor: { name: '王老师' },
            matchScore: 0.85
          }
        ],
        pagination: {
          total: 1,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 1
        }
      };
      
      res.json({
        success: true,
        data: results,
        message: '搜索成功'
      });
    } catch (error) {
      console.error('搜索失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '搜索失败'
      });
    }
  },

  /**
   * 获取热门课程
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPopularCourses(req, res) {
    try {
      // const popularCourses = await SkillTeachingModel.getPopularCourses();
      
      // 模拟数据
      const popularCourses = [
        {
          id: 1,
          title: '基础红旗刺绣入门教程',
          studentCount: 245,
          averageRating: 4.8,
          coverImage: '/uploads/images/course-basic.jpg'
        },
        {
          id: 5,
          title: '红旗刺绣快速入门',
          studentCount: 187,
          averageRating: 4.7,
          coverImage: '/uploads/images/course-quick.jpg'
        },
        {
          id: 3,
          title: '中级刺绣技法提升',
          studentCount: 132,
          averageRating: 4.9,
          coverImage: '/uploads/images/course-intermediate.jpg'
        }
      ];
      
      res.json({
        success: true,
        data: popularCourses,
        message: '获取热门课程成功'
      });
    } catch (error) {
      console.error('获取热门课程失败:', error);
      res.status(500).json({
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取热门课程失败'
      });
    }
  }
};

module.exports = SkillTeachingController;