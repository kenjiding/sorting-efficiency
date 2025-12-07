#!/bin/bash

# 数据迁移脚本 - 供应商、路由、关联关系
# 使用方法：
# 1. 在当前电脑（源）运行：./migrate-data.sh export
# 2. 将生成的 backup 文件夹复制到新电脑
# 3. 在新电脑（目标）运行：./migrate-data.sh import

DB_NAME="sorting-management"
COLLECTIONS=("suppliers" "routes" "supplierroutemappings")
BACKUP_DIR="./backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 MongoDB 工具是否安装
check_mongodb_tools() {
    if ! command -v mongodump &> /dev/null; then
        print_error "mongodump 未安装，请先安装 MongoDB Database Tools"
        print_info "macOS: brew install mongodb-database-tools"
        print_info "Ubuntu: sudo apt-get install mongodb-database-tools"
        exit 1
    fi
    
    if ! command -v mongorestore &> /dev/null; then
        print_error "mongorestore 未安装，请先安装 MongoDB Database Tools"
        exit 1
    fi
}

# 检查 MongoDB 连接
check_connection() {
    print_info "检查 MongoDB 连接..."
    if ! mongosh --eval "db.adminCommand('ping')" --quiet &> /dev/null; then
        print_error "无法连接到 MongoDB，请确保 MongoDB 正在运行"
        print_info "Docker: docker-compose up -d mongodb"
        exit 1
    fi
    print_info "MongoDB 连接成功 ✓"
}

# 导出数据
export_data() {
    print_info "开始导出数据..."
    check_connection
    
    BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"
    mkdir -p "$BACKUP_PATH"
    
    print_info "导出集合: ${COLLECTIONS[*]}"
    
    for collection in "${COLLECTIONS[@]}"; do
        print_info "正在导出: $collection"
        mongodump \
            --db="$DB_NAME" \
            --collection="$collection" \
            --out="$BACKUP_PATH" \
            --quiet
        
        if [ $? -eq 0 ]; then
            print_info "✓ $collection 导出成功"
        else
            print_error "✗ $collection 导出失败"
        fi
    done
    
    # 创建元数据文件
    cat > "$BACKUP_PATH/migration_info.txt" << EOF
数据迁移信息
=============
导出时间: $(date)
数据库名: $DB_NAME
集合列表: ${COLLECTIONS[*]}
导出工具: mongodump
EOF
    
    # 压缩备份
    print_info "压缩备份文件..."
    cd "$BACKUP_DIR"
    tar -czf "migration_${TIMESTAMP}.tar.gz" "$TIMESTAMP"
    cd ..
    
    print_info "✓ 数据导出完成！"
    print_info "备份位置: ${BACKUP_PATH}"
    print_info "压缩文件: ${BACKUP_DIR}/migration_${TIMESTAMP}.tar.gz"
    print_info ""
    print_warn "请将以下文件复制到新电脑："
    print_info "  - ${BACKUP_DIR}/migration_${TIMESTAMP}.tar.gz"
    print_info "  或整个文件夹: ${BACKUP_PATH}"
}

# 导入数据
import_data() {
    print_info "开始导入数据..."
    check_connection
    
    # 查找备份文件
    if [ -d "$BACKUP_DIR" ]; then
        # 查找最新的备份目录
        LATEST_BACKUP=$(find "$BACKUP_DIR" -type d -name "20*" | sort -r | head -1)
        
        if [ -z "$LATEST_BACKUP" ]; then
            # 查找压缩文件
            LATEST_TAR=$(find "$BACKUP_DIR" -name "migration_*.tar.gz" | sort -r | head -1)
            if [ -n "$LATEST_TAR" ]; then
                print_info "发现压缩文件，正在解压..."
                cd "$BACKUP_DIR"
                tar -xzf "$LATEST_TAR"
                cd ..
                LATEST_BACKUP=$(find "$BACKUP_DIR" -type d -name "20*" | sort -r | head -1)
            fi
        fi
        
        if [ -z "$LATEST_BACKUP" ]; then
            print_error "未找到备份文件，请先运行导出命令"
            exit 1
        fi
        
        print_info "使用备份: $LATEST_BACKUP"
    else
        print_error "备份目录不存在: $BACKUP_DIR"
        print_info "请先运行: ./migrate-data.sh export"
        exit 1
    fi
    
    # 确认操作
    print_warn "即将导入以下集合到数据库 '$DB_NAME':"
    for collection in "${COLLECTIONS[@]}"; do
        echo "  - $collection"
    done
    read -p "是否继续？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "已取消导入"
        exit 0
    fi
    
    # 导入数据
    RESTORE_PATH="${LATEST_BACKUP}/${DB_NAME}"
    if [ ! -d "$RESTORE_PATH" ]; then
        print_error "备份文件结构不正确: $RESTORE_PATH"
        exit 1
    fi
    
    print_info "开始导入数据..."
    mongorestore \
        --db="$DB_NAME" \
        --dir="$RESTORE_PATH" \
        --drop \
        --quiet
    
    if [ $? -eq 0 ]; then
        print_info "✓ 数据导入成功！"
        
        # 显示导入统计
        print_info ""
        print_info "导入统计:"
        for collection in "${COLLECTIONS[@]}"; do
            count=$(mongosh "$DB_NAME" --eval "db.${collection}.countDocuments()" --quiet)
            print_info "  - $collection: $count 条记录"
        done
    else
        print_error "✗ 数据导入失败"
        exit 1
    fi
}

# 主函数
main() {
    case "$1" in
        export)
            check_mongodb_tools
            export_data
            ;;
        import)
            check_mongodb_tools
            import_data
            ;;
        *)
            echo "使用方法:"
            echo "  导出数据: $0 export"
            echo "  导入数据: $0 import"
            echo ""
            echo "说明:"
            echo "  1. 在源电脑运行: $0 export"
            echo "  2. 将 backup 文件夹复制到目标电脑"
            echo "  3. 在目标电脑运行: $0 import"
            exit 1
            ;;
    esac
}

main "$@"

